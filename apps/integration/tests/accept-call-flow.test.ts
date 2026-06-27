jest.mock('src/services/users');
jest.mock('@/src/services/online-users', () => ({
    fetchOnlineUsers: jest.fn(),
}));
jest.mock('@/src/services/calls', () => ({
    fetchCall: jest.fn(),
}));

import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { DailyCoService } from './helpers/daily-service';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { InitWs } from '../../web/src/services/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/transport';
import { AuthSession } from '../../web/src/auth/session';

import * as usersService from 'src/services/users';
import * as onlineUsersService from '@/src/services/online-users';
import * as callsService from '@/src/services/calls';

const addToIamMock = usersService.addToIam as jest.Mock;
const fetchOnlineUsersMock = onlineUsersService.fetchOnlineUsers as jest.Mock;
const fetchCallMock = callsService.fetchCall as jest.Mock;

const pendingCalls: Array<Promise<unknown>> = [];

async function flushPendingCalls(): Promise<void> {
    const snapshot = [...pendingCalls];
    pendingCalls.length = 0;
    await Promise.all(snapshot);
}

function createBridgedClient(user: IUser, token: string) {
    const serverWs = createWsClient(user, token);

    const webFactory: TransportFactory = (_url: string): ITransport => {
        const transport: ITransport = {
            get readyState() { return serverWs.readyState; },
            onopen: null,
            onmessage: null,
            onerror: null,
            onclose: null,
            send(data: string) {
                (serverWs as unknown as EventEmitter).emit('message', data);
            },
            close() {
                serverWs.terminate();
            },
        };

        (serverWs as unknown as EventEmitter).on('sent', (data: string) => {
            transport.onmessage?.({ data } as any);
        });

        return transport;
    };

    return { serverWs, webFactory };
}

describe('Accept Call Flow', () => {
    let iamRequest: IamAgent;
    let customerUser: IUser;
    let attendantUser: IUser;

    let customerStores: Stores;
    let attendantStores: Stores;

    beforeAll(async () => {
        iamRequest = await startIamServer();
        await startRealtimeServer();
        const users = await createMockUsers();
        customerUser = { ...users.customer, tokens: 10 };
        attendantUser = users.attendant;
    });

    afterAll(async () => {
        stopRealtimeServer();
        await stopIamServer();
    });

    beforeEach(async () => {
        await getRedisClient().del('online_users');

        clientRegistry.clear();
        pendingCalls.length = 0;
        jest.clearAllMocks();
        DailyCoService.reset();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        addToIamMock.mockImplementation((user: IOnlineUser) => {
            const op = iamRequest
                .post('/online-users/add')
                .set('Authorization', CUSTOMER_TOKEN)
                .send(user);
            pendingCalls.push(op);
            return op;
        });

        fetchOnlineUsersMock.mockImplementation(async () => {
            const res = await iamRequest
                .get('/online-users/list')
                .set('Authorization', CUSTOMER_TOKEN);
            return res.body.users ?? [];
        });

        fetchCallMock.mockImplementation(async (customerId: string, attendantId: string) => {
            const res = await iamRequest
                .get('/calls/get')
                .set('Authorization', CUSTOMER_TOKEN)
                .query({ customerId, attendantId });
            return res.body;
        });
    });

    it('attendant accepts incoming call and both stores reflect the accepted state', async () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        const customerInitWs = new InitWs();
        const attendantInitWs = new InitWs();

        const dailyService = DailyCoService.getInstance();

        attendantStores = createStores(dailyService);
        customerStores = createStores(dailyService);

        customerInitWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        attendantInitWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);

        // ── both users connect and become idle ──────────────────────────
        onConnection()(customerWs);
        await flushPendingCalls();

        onConnection()(attendantWs);
        await flushPendingCalls();

        expect(customerStores.onlineUsers.getState().users).toHaveLength(2);
        expect(attendantStores.onlineUsers.getState().users).toHaveLength(2);

        // ── customer sends incoming call ────────────────────────────────
        customerStores.callView.getState().setSelectedAttendantId(attendantUser._id);
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );

        await new Promise((r) => setTimeout(r, 50));

        // ── verify both stores received the incoming call ───────────────
        expect(customerStores.incomingCall.getState().incomingCall).toBeTruthy();
        expect(attendantStores.incomingCall.getState().incomingCall).toBeTruthy();

        // ── attendant accepts the call ──────────────────────────────────
        AuthSession.override({ token: ATTENDANT_TOKEN });
        attendantStores.call.getState().acceptIncomingCall();

        await new Promise((r) => setTimeout(r, 200));

        // Zustand's `set` is closure-bound to each store instance, so
        // call state is set correctly on both stores. Module-level singletons
        // (useIncomingCallStore, useCallViewStore) point to customerStores
        // (the last createStores call), so incomingCall/callView assertions
        // go through customerStores only.

        // ── customer store: call populated ─────────────────────────────
        const customerCall = customerStores.call.getState().call;
        expect(customerCall).toBeTruthy();
        expect(customerCall!.customerId).toBe(customerUser._id);
        expect(customerCall!.attendantId).toBe(attendantUser._id);
        expect(customerCall!.customerInCall).toBe(true);
        expect(customerCall!.attendantInCall).toBe(true);

        // ── attendant store: call populated ────────────────────────────
        const attendantCall = attendantStores.call.getState().call;
        expect(attendantCall).toBeTruthy();
        expect(attendantCall!.customerId).toBe(customerUser._id);
        expect(attendantCall!.attendantId).toBe(attendantUser._id);
        expect(attendantCall!.customerInCall).toBe(true);
        expect(attendantCall!.attendantInCall).toBe(true);

        // ── incomingCall cleared (via singleton — points to customerStores) ──────
        expect(customerStores.incomingCall.getState().incomingCall).toBeNull();

        // ── callView: 'in-call' now happens in updateJoinedView (Daily participant.joined),
        //    not in incomingCallAccepted. After accept, singleton keeps last writer's state.

        // ── Redis: incoming_call entry deleted ──────────────────────────
        const redis = getRedisClient();
        const incomingCallRedis = await redis.get(`incoming_call:${attendantUser._id}`);
        expect(incomingCallRedis).toBeNull();

        // dailyService.join depends on useCurrentUserStore (not populated in integration tests)
    });
});
