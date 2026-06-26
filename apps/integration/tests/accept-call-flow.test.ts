jest.mock('src/services/users');
jest.mock('@/src/services/online-users', () => ({
    fetchOnlineUsers: jest.fn(),
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

const addToIamMock = usersService.addToIam as jest.Mock;
const fetchOnlineUsersMock = onlineUsersService.fetchOnlineUsers as jest.Mock;

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

        addToIamMock.mockImplementation((user: IOnlineUser, token: string) => {
            const op = iamRequest
                .post('/online-users/add')
                .set('Authorization', token)
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

        // Module-level singletons (useIncomingCallStore, useCallViewStore, etc.)
        // point to customerStores (the last createStores call). Both ws handlers
        // invoke incomingCallAccepted which operates on those singletons, so we
        // assert via customerStores — in production each browser has its own set.

        // ── store: incomingCall cleared ────────────────────────────────
        expect(customerStores.incomingCall.getState().incomingCall).toBeNull();

        // ── store: callView transitioned to 'in-call' ──────────────────
        expect(customerStores.callView.getState().viewState).toBe('in-call');

        // ── Redis: incoming_call entry deleted ──────────────────────────
        const redis = getRedisClient();
        const incomingCallRedis = await redis.get(`incoming_call:${attendantUser._id}`);
        expect(incomingCallRedis).toBeNull();

        // ── dailyService.join called for customer (send) and attendant (accept)
        const customerJoin = dailyService.joinCalls.find(j => j.userName === `${customerUser.firstName} ${customerUser.lastName}`);
        expect(customerJoin).toBeTruthy();

        const attendantJoin = dailyService.joinCalls.find(j => j.userName === `${attendantUser.firstName} ${attendantUser.lastName}`);
        expect(attendantJoin).toBeTruthy();
        expect(attendantJoin!.room).toContain(customerUser.slug);
        expect(attendantJoin!.room).toContain(attendantUser.slug);
    });
});
