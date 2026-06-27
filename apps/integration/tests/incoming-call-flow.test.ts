jest.mock('src/services/users');
jest.mock('@/src/services/online-users', () => ({
    fetchOnlineUsers: jest.fn(),
}));
const mockSendIncomingCall = jest.fn();
const mockCancelIncomingCall = jest.fn();
jest.mock('@/src/services/incoming-calls', () => ({
    sendIncomingCall: mockSendIncomingCall,
    cancelIncomingCall: mockCancelIncomingCall,
    acceptIncomingCall: jest.fn(),
}));

import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser, mapUserToOnlineUser } from '@repo/shared-types';

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

        mockSendIncomingCall.mockImplementation(async (customerId: string, attendantId: string) => {
            await iamRequest
                .post('/incoming-calls/send')
                .set('Authorization', CUSTOMER_TOKEN)
                .send({ customerId, attendantId, whoIsCalling: 'customer' });
        });

        mockCancelIncomingCall.mockImplementation(async (customerId: string, attendantId: string) => {
            await iamRequest
                .post('/incoming-calls/cancel')
                .set('Authorization', CUSTOMER_TOKEN)
                .send({ customerId, attendantId });
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

        // ── customer stores (singletons → customer) ───────────────────
        const dailyService = DailyCoService.getInstance();
        const customerStores = createStores(dailyService);

        const customerOnlineUser = mapUserToOnlineUser(customerUser);
        const attendantOnlineUser = mapUserToOnlineUser(attendantUser);
        customerStores.onlineUsers.setState({ users: [customerOnlineUser, attendantOnlineUser] });

        // ── customer triggers sendIncomingCall via store action ────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );

        await new Promise((r) => setTimeout(r, 50));

        // ── process customer WS message ───────────────────────────────
        const sentMsg = customerMessages.find((m) => m.event === 'incoming_call_sent');
        expect(sentMsg).toBeTruthy();
        customerStores.incomingCall.getState().incomingCallSent(sentMsg.data.incomingCall);
        await new Promise((r) => setTimeout(r, 50));

        expect(customerStores.incomingCall.getState().incomingCall).toBeTruthy();
        expect(customerStores.incomingCall.getState().incomingCall!.customerId).toBe(customerUser._id);
        expect(customerStores.incomingCall.getState().incomingCall!.attendantId).toBe(attendantUser._id);
        expect(customerStores.callView.getState().viewState).toBe('awaiting-answer');
        expect(customerStores.call.getState().call).toBeNull();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('occupied');

        // ── attendant stores (singletons → attendant) ─────────────────
        const attendantStores = createStores(dailyService);

        const recvMsg = attendantMessages.find((m) => m.event === 'incoming_call_received');
        expect(recvMsg).toBeTruthy();
        attendantStores.incomingCall.getState().incomingCallReceived(recvMsg.data.incomingCall);
        await new Promise((r) => setTimeout(r, 50));

        expect(attendantStores.incomingCall.getState().incomingCall).toBeTruthy();
        expect(attendantStores.incomingCall.getState().incomingCall!.customerId).toBe(customerUser._id);
        expect(attendantStores.incomingCall.getState().incomingCall!.attendantId).toBe(attendantUser._id);
        expect(attendantStores.callView.getState().viewState).toBe('awaiting-to-answer');
        expect(attendantStores.call.getState().call).toBeNull();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('occupied');
    });

    it('after cancelIncomingCall both stores are cleared and users back to idle', async () => {
        const customerWs = createWsClient(customerUser, CUSTOMER_TOKEN);
        const attendantWs = createWsClient(attendantUser, ATTENDANT_TOKEN);

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

        // ── customer stores (singletons → customer) ───────────────────
        const dailyService = DailyCoService.getInstance();
        const customerStores = createStores(dailyService);

        const customerOnlineUser = mapUserToOnlineUser(customerUser);
        const attendantOnlineUser = mapUserToOnlineUser(attendantUser);
        customerStores.onlineUsers.setState({ users: [customerOnlineUser, attendantOnlineUser] });

        // ── send incoming call ────────────────────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        await new Promise((r) => setTimeout(r, 50));

        const sentMsg = customerMessages.find((m) => m.event === 'incoming_call_sent');
        customerStores.incomingCall.getState().incomingCallSent(sentMsg.data.incomingCall);
        await new Promise((r) => setTimeout(r, 50));

        expect(customerStores.callView.getState().viewState).toBe('awaiting-answer');

        // ── customer cancels ──────────────────────────────────────────
        customerMessages.length = 0;
        attendantMessages.length = 0;

        customerStores.incomingCall.getState().cancelIncomingCall();
        await new Promise((r) => setTimeout(r, 50));

        // ── process cancel WS event on customer side ──────────────────
        const customerCancelMsg = customerMessages.find((m) => m.event === 'incoming_call_cancelled');
        expect(customerCancelMsg).toBeTruthy();
        customerStores.incomingCall.getState().incomingCallCancelled();
        await new Promise((r) => setTimeout(r, 50));

        expect(customerStores.incomingCall.getState().incomingCall).toBeNull();
        expect(customerStores.callView.getState().viewState).toBe('none');
        expect(customerStores.callView.getState().selectedAttendantId).toBeNull();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('idle');

        // ── process cancel WS event on attendant side ─────────────────
        const attendantCancelMsg = attendantMessages.find((m) => m.event === 'incoming_call_cancelled');
        expect(attendantCancelMsg).toBeTruthy();

        const attendantStores = createStores(dailyService);
        attendantStores.incomingCall.getState().incomingCallReceived(sentMsg.data.incomingCall);
        attendantStores.incomingCall.getState().incomingCallCancelled();
        await new Promise((r) => setTimeout(r, 50));

        expect(attendantStores.incomingCall.getState().incomingCall).toBeNull();
        expect(attendantStores.callView.getState().viewState).toBe('none');
        expect(attendantStores.callView.getState().selectedAttendantId).toBeNull();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('idle');
    });

    it('attendant cancels incoming call — both stores cleared and users back to idle', async () => {
        const customerWs = createWsClient(customerUser, CUSTOMER_TOKEN);
        const attendantWs = createWsClient(attendantUser, ATTENDANT_TOKEN);

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

        // ── send incoming call from customer ──────────────────────────
        const dailyService = DailyCoService.getInstance();
        const customerStores = createStores(dailyService);

        const customerOnlineUser = mapUserToOnlineUser(customerUser);
        const attendantOnlineUser = mapUserToOnlineUser(attendantUser);
        customerStores.onlineUsers.setState({ users: [customerOnlineUser, attendantOnlineUser] });

        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        await new Promise((r) => setTimeout(r, 50));

        const sentMsg = customerMessages.find((m) => m.event === 'incoming_call_sent');

        // ── attendant receives and then cancels (singletons → attendant)
        const attendantStores = createStores(dailyService);

        const recvMsg = attendantMessages.find((m) => m.event === 'incoming_call_received');
        attendantStores.incomingCall.getState().incomingCallReceived(recvMsg.data.incomingCall);
        await new Promise((r) => setTimeout(r, 50));

        expect(attendantStores.callView.getState().viewState).toBe('awaiting-to-answer');

        customerMessages.length = 0;
        attendantMessages.length = 0;

        attendantStores.incomingCall.getState().cancelIncomingCall();
        await new Promise((r) => setTimeout(r, 50));

        // ── process cancel WS on attendant side ───────────────────────
        const attendantCancelMsg = attendantMessages.find((m) => m.event === 'incoming_call_cancelled');
        expect(attendantCancelMsg).toBeTruthy();
        attendantStores.incomingCall.getState().incomingCallCancelled();
        await new Promise((r) => setTimeout(r, 50));

        expect(attendantStores.incomingCall.getState().incomingCall).toBeNull();
        expect(attendantStores.callView.getState().viewState).toBe('none');
        expect(attendantStores.callView.getState().selectedAttendantId).toBeNull();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('idle');

        // ── process cancel WS on customer side (singletons → customer)
        const customerCancelMsg = customerMessages.find((m) => m.event === 'incoming_call_cancelled');
        expect(customerCancelMsg).toBeTruthy();

        const customerStores2 = createStores(dailyService);
        customerStores2.incomingCall.getState().incomingCallSent(sentMsg.data.incomingCall);
        customerStores2.incomingCall.getState().incomingCallCancelled();
        await new Promise((r) => setTimeout(r, 50));

        expect(customerStores2.incomingCall.getState().incomingCall).toBeNull();
        expect(customerStores2.callView.getState().viewState).toBe('none');
        expect(customerStores2.callView.getState().selectedAttendantId).toBeNull();
        expect(customerStores2.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('idle');
    });
});
