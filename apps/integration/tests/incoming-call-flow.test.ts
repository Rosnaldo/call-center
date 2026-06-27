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

import { createStores } from '../../web/src/states/stores';
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

// ─── suite ──────────────────────────────────────────────────────────────────

describe('Incoming Call Flow', () => {
    let iamRequest: IamAgent;
    let customerUser: IUser;
    let attendantUser: IUser;

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
        const redis = getRedisClient();
        const icKeys = await redis.keys('incoming_call:*');
        if (icKeys.length) await redis.del(...icKeys);

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

    it('after sendIncomingCall both stores reflect the correct state', async () => {
        // ── connect both server-side WS clients ────────────────────────
        const customerWs = createWsClient(customerUser, CUSTOMER_TOKEN);
        const attendantWs = createWsClient(attendantUser, ATTENDANT_TOKEN);

        // ── capture raw WS messages ────────────────────────────────────
        const customerMessages: any[] = [];
        const attendantMessages: any[] = [];

        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });
        (attendantWs as unknown as EventEmitter).on('sent', (data: string) => {
            attendantMessages.push(JSON.parse(data));
        });

        onConnection()(customerWs);
        await flushPendingCalls();
        onConnection()(attendantWs);
        await flushPendingCalls();

        // ── customer sends incoming call ───────────────────────────────
        await iamRequest
            .post('/incoming-calls/send')
            .set('Authorization', CUSTOMER_TOKEN)
            .send({ customerId: customerUser._id, attendantId: attendantUser._id, whoIsCalling: 'customer' });

        await new Promise((r) => setTimeout(r, 50));

        const sentMsg = customerMessages.find((m) => m.event === 'incoming_call_sent');
        const recvMsg = attendantMessages.find((m) => m.event === 'incoming_call_received');

        // ── customer stores (singletons → customer) ───────────────────
        const dailyService = DailyCoService.getInstance();
        const customerStores = createStores(dailyService);
        customerStores.incomingCall.getState().incomingCallSent(sentMsg.data.incomingCall);
        await new Promise((r) => setTimeout(r, 50));

        const customerIncoming = customerStores.incomingCall.getState().incomingCall;
        expect(customerIncoming).toBeTruthy();
        expect(customerIncoming!.customerId).toBe(customerUser._id);
        expect(customerIncoming!.attendantId).toBe(attendantUser._id);
        expect(customerStores.callView.getState().viewState).toBe('awaiting-answer');
        expect(customerStores.call.getState().call).toBeNull();
        const customerOnline = customerStores.onlineUsers.getState().users
            .find((u) => u.id === customerUser._id);
        expect(customerOnline?.status).toBe('occupied');

        // ── attendant stores (singletons → attendant) ─────────────────
        const attendantStores = createStores(dailyService);
        attendantStores.incomingCall.getState().incomingCallReceived(recvMsg.data.incomingCall);
        await new Promise((r) => setTimeout(r, 50));

        const attendantIncoming = attendantStores.incomingCall.getState().incomingCall;
        expect(attendantIncoming).toBeTruthy();
        expect(attendantIncoming!.customerId).toBe(customerUser._id);
        expect(attendantIncoming!.attendantId).toBe(attendantUser._id);
        expect(attendantStores.callView.getState().viewState).toBe('awaiting-to-answer');
        expect(attendantStores.call.getState().call).toBeNull();
        const attendantOnline = attendantStores.onlineUsers.getState().users
            .find((u) => u.id === attendantUser._id);
        expect(attendantOnline?.status).toBe('occupied');
    });
});
