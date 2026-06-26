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

// ─── bridge helpers ─────────────────────────────────────────────────────────

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

// ─── suite ──────────────────────────────────────────────────────────────────

describe('Incoming Call Flow', () => {
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
    });

    it('sendIncomingCall emits to customer and attendant stores', async () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        const customerInitWs = new InitWs();
        const attendantInitWs = new InitWs();

        const dailyService = DailyCoService.getInstance();

        // attendantStores first so module-level singletons end up on customerStores
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

        const customerIdle = customerStores.onlineUsers.getState().users
            .find(u => u.id === customerUser._id);
        const attendantIdle = customerStores.onlineUsers.getState().users
            .find(u => u.id === attendantUser._id);
        expect(customerIdle?.status).toBe('idle');
        expect(attendantIdle?.status).toBe('idle');

        // ── customer selects attendant and calls sendIncomingCall ────────
        customerStores.callView.getState().setSelectedAttendantId(attendantUser._id);
        expect(customerStores.callView.getState().selectedAttendantId).toBe(attendantUser._id);

        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );

        // allow async store actions (fetchOnlineUsers) to settle
        await new Promise((r) => setTimeout(r, 50));

        // ── customer store received incoming_call_sent ───────────────────
        const customerIncoming = customerStores.incomingCall.getState().incomingCall;
        expect(customerIncoming).toBeTruthy();
        expect(customerIncoming!.customerId).toBe(customerUser._id);
        expect(customerIncoming!.attendantId).toBe(attendantUser._id);
        expect(customerIncoming!.calledBy).toBe('customer');
        // ── attendant store received incoming_call_received ──────────────
        const attendantIncoming = attendantStores.incomingCall.getState().incomingCall;
        expect(attendantIncoming).toBeTruthy();
        expect(attendantIncoming!.customerId).toBe(customerUser._id);
        expect(attendantIncoming!.attendantId).toBe(attendantUser._id);
        expect(attendantIncoming!.calledBy).toBe('customer');

        // singleton callView ends up as 'awaiting-to-answer' (last writer wins)
        expect(customerStores.callView.getState().viewState).toBe('awaiting-to-answer');

        // dailyService.join now happens in incomingCallAccepted (call actions), not sendIncomingCall

        // ── customer cancels the incoming call ──────────────────────────
        customerStores.incomingCall.getState().cancelIncomingCall();

        await new Promise((r) => setTimeout(r, 50));

        // ── both stores cleared incomingCall ─────────────────────────────
        expect(customerStores.incomingCall.getState().incomingCall).toBeNull();
        expect(attendantStores.incomingCall.getState().incomingCall).toBeNull();

        // ── selectedAttendantId cleared on both sides ───────────────────
        expect(customerStores.callView.getState().selectedAttendantId).toBeNull();
        expect(attendantStores.callView.getState().selectedAttendantId).toBeNull();

        // ── both users back to idle ─────────────────────────────────────
        const customerAfterCancel = customerStores.onlineUsers.getState().users
            .find(u => u.id === customerUser._id);
        const attendantAfterCancel = customerStores.onlineUsers.getState().users
            .find(u => u.id === attendantUser._id);
        expect(customerAfterCancel?.status).toBe('idle');
        expect(attendantAfterCancel?.status).toBe('idle');
    });
});
