jest.mock('src/services/users');
jest.mock('@/src/services/api/online-users', () => ({
    fetchOnlineUsers: jest.fn(),
}));
const mockSendIncomingCall = jest.fn();
const mockCancelIncomingCall = jest.fn();
jest.mock('@/src/services/api/incoming-calls', () => ({
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

import { createStores, Stores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

import * as usersService from 'src/services/users';
import * as onlineUsersService from '@/src/services/api/online-users';

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
        const redis = getRedisClient();
        const icKeys = await redis.keys('incoming_call:*');
        if (icKeys.length) await redis.del(...icKeys);

        clientRegistry.clear();
        pendingCalls.length = 0;
        jest.clearAllMocks();
        DailyCoService.reset();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        const dailyService = DailyCoService.getInstance();
        customerStores = createStores(dailyService);
        attendantStores = createStores(dailyService);

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
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        const customerMessages: any[] = [];
        const attendantMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });
        (attendantWs as unknown as EventEmitter).on('sent', (data: string) => {
            attendantMessages.push(JSON.parse(data));
        });

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        customerStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });
        attendantStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);

        onConnection()(customerWs);
        await flushPendingCalls();
        onConnection()(attendantWs);
        await flushPendingCalls();

        // ── customer triggers sendIncomingCall ────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        await new Promise((r) => setTimeout(r, 50));

        // ── both receive events ──────────────────────────────────────
        const sentMsg = customerMessages.find((m) => m.event === 'incoming_call_sent');
        const recvMsg = attendantMessages.find((m) => m.event === 'incoming_call_received');
        expect(sentMsg).toBeTruthy();
        expect(recvMsg).toBeTruthy();

        // ── customer state (auto-processed via incoming_call_sent) ────
        expect(customerStores.incomingCall.getState().incomingCall).toBeTruthy();
        expect(customerStores.incomingCall.getState().incomingCall!.customerId).toBe(customerUser._id);
        expect(customerStores.incomingCall.getState().incomingCall!.attendantId).toBe(attendantUser._id);
        expect(customerStores.callView.getState().viewState).toBe('awaiting-answer');
        expect(customerStores.call.getState().call).toBeNull();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('occupied');

        // ── attendant state (auto-processed via incoming_call_received)
        expect(attendantStores.incomingCall.getState().incomingCall).toBeTruthy();
        expect(attendantStores.incomingCall.getState().incomingCall!.customerId).toBe(customerUser._id);
        expect(attendantStores.incomingCall.getState().incomingCall!.attendantId).toBe(attendantUser._id);
        expect(attendantStores.callView.getState().viewState).toBe('awaiting-to-answer');
        expect(attendantStores.call.getState().call).toBeNull();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('occupied');
    });

    it('after cancelIncomingCall both stores are cleared and users back to idle', async () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        const customerMessages: any[] = [];
        const attendantMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });
        (attendantWs as unknown as EventEmitter).on('sent', (data: string) => {
            attendantMessages.push(JSON.parse(data));
        });

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        customerStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });
        attendantStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);

        onConnection()(customerWs);
        await flushPendingCalls();
        onConnection()(attendantWs);
        await flushPendingCalls();

        // ── send incoming call ────────────────────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        await new Promise((r) => setTimeout(r, 50));

        expect(customerStores.callView.getState().viewState).toBe('awaiting-answer');

        // ── customer cancels ──────────────────────────────────────────
        customerMessages.length = 0;
        attendantMessages.length = 0;

        customerStores.incomingCall.getState().cancelIncomingCall();
        await new Promise((r) => setTimeout(r, 50));

        const customerCancelMsg = customerMessages.find((m) => m.event === 'incoming_call_cancelled');
        const attendantCancelMsg = attendantMessages.find((m) => m.event === 'incoming_call_cancelled');
        expect(customerCancelMsg).toBeTruthy();
        expect(attendantCancelMsg).toBeTruthy();

        // ── customer state cleared (auto-processed) ───────────────────
        expect(customerStores.incomingCall.getState().incomingCall).toBeNull();
        expect(customerStores.callView.getState().viewState).toBe('none');
        expect(customerStores.callView.getState().selectedAttendantId).toBeNull();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('idle');

        // ── attendant state cleared (auto-processed) ──────────────────
        expect(attendantStores.incomingCall.getState().incomingCall).toBeNull();
        expect(attendantStores.callView.getState().viewState).toBe('none');
        expect(attendantStores.callView.getState().selectedAttendantId).toBeNull();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('idle');
    });

    it('attendant cancels incoming call — both stores cleared and users back to idle', async () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        const customerMessages: any[] = [];
        const attendantMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });
        (attendantWs as unknown as EventEmitter).on('sent', (data: string) => {
            attendantMessages.push(JSON.parse(data));
        });

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        customerStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });
        attendantStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);

        onConnection()(customerWs);
        await flushPendingCalls();
        onConnection()(attendantWs);
        await flushPendingCalls();

        // ── send incoming call ────────────────────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        await new Promise((r) => setTimeout(r, 50));

        expect(attendantStores.callView.getState().viewState).toBe('awaiting-to-answer');

        // ── attendant cancels ─────────────────────────────────────────
        customerMessages.length = 0;
        attendantMessages.length = 0;

        attendantStores.incomingCall.getState().cancelIncomingCall();
        await new Promise((r) => setTimeout(r, 50));

        const attendantCancelMsg = attendantMessages.find((m) => m.event === 'incoming_call_cancelled');
        const customerCancelMsg = customerMessages.find((m) => m.event === 'incoming_call_cancelled');
        expect(attendantCancelMsg).toBeTruthy();
        expect(customerCancelMsg).toBeTruthy();

        // ── attendant state cleared (auto-processed) ──────────────────
        expect(attendantStores.incomingCall.getState().incomingCall).toBeNull();
        expect(attendantStores.callView.getState().viewState).toBe('none');
        expect(attendantStores.callView.getState().selectedAttendantId).toBeNull();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('idle');

        // ── customer state cleared (auto-processed) ───────────────────
        expect(customerStores.incomingCall.getState().incomingCall).toBeNull();
        expect(customerStores.callView.getState().viewState).toBe('none');
        expect(customerStores.callView.getState().selectedAttendantId).toBeNull();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('idle');
    });
});
