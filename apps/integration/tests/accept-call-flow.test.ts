jest.mock('src/services/users');
jest.mock('@/src/services/api/online-users', () => ({ fetchOnlineUsers: jest.fn() }));
const mockSendIncomingCall = jest.fn();
const mockAcceptIncomingCall = jest.fn();
jest.mock('@/src/services/api/incoming-calls', () => ({
    sendIncomingCall: mockSendIncomingCall,
    cancelIncomingCall: jest.fn(),
    acceptIncomingCall: mockAcceptIncomingCall,
}));
const mockFetchCall = jest.fn();
const mockCompleteCall = jest.fn();
jest.mock('@/src/services/api/calls', () => ({
    fetchCall: mockFetchCall,
    completeCall: mockCompleteCall,
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
        const redis = getRedisClient();
        const icKeys = await redis.keys('incoming_call:*');
        if (icKeys.length) await redis.del(...icKeys);
        const callKeys = await redis.keys('calls:*');
        if (callKeys.length) await redis.del(...callKeys);

        clientRegistry.clear();
        pendingCalls.length = 0;
        jest.clearAllMocks();
        DailyCoService.reset();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        const dailyService = DailyCoService.getInstance();
        customerStores = createStores(dailyService);
        attendantStores = createStores(dailyService);

        addToIamMock.mockImplementation((user: IOnlineUser) => {
            const op = iamRequest.post('/online-users/add').set('Authorization', CUSTOMER_TOKEN).send(user);
            pendingCalls.push(op);
            return op;
        });

        fetchOnlineUsersMock.mockImplementation(async () => {
            const res = await iamRequest.get('/online-users/list').set('Authorization', CUSTOMER_TOKEN);
            return res.body.users ?? [];
        });

        mockSendIncomingCall.mockImplementation(async (customerId: string, attendantId: string) => {
            await iamRequest.post('/incoming-calls/send').set('Authorization', CUSTOMER_TOKEN)
                .send({ customerId, attendantId, whoIsCalling: 'customer' });
        });

        mockAcceptIncomingCall.mockImplementation(async (attendantId: string) => {
            await iamRequest.post('/incoming-calls/accept').set('Authorization', ATTENDANT_TOKEN)
                .send({ attendantId, userId: attendantId });
        });

        mockFetchCall.mockImplementation(async (customerId: string, attendantId: string) => {
            const res = await iamRequest.get('/calls/get')
                .query({ customerId, attendantId }).set('Authorization', CUSTOMER_TOKEN);
            return res.body;
        });

        mockCompleteCall.mockImplementation(async (customerId: string, attendantId: string) => {
            await iamRequest.post('/calls/complete').set('Authorization', CUSTOMER_TOKEN)
                .send({ customerId, attendantId });
        });
    });

    it('after accept both users are in-call', async () => {
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

        customerStores.currentUser.setState({ currentUser: mapUserToOnlineUser(customerUser) });
        customerStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });
        attendantStores.currentUser.setState({ currentUser: mapUserToOnlineUser(attendantUser) });
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
        customerStores.incomingCall.getState().sendIncomingCall(customerUser._id, attendantUser._id);
        await new Promise((r) => setTimeout(r, 100));

        // ── accept call ───────────────────────────────────────────────
        const acceptMsg = attendantMessages.find((m) => m.event === 'incoming_call_received');
        expect(acceptMsg).toBeTruthy();

        customerMessages.length = 0;
        attendantMessages.length = 0;

        await attendantStores.call.getState().acceptIncomingCall();
        await new Promise((r) => setTimeout(r, 100));

        // ── both users receive call_accepted ──────────────────────────
        const customerAccepted = customerMessages.find((m) => m.event === 'call_accepted');
        const attendantAccepted = attendantMessages.find((m) => m.event === 'call_accepted');
        expect(customerAccepted).toBeTruthy();
        expect(attendantAccepted).toBeTruthy();

        // ── both receive online_users_broadcast after accept ─────────
        const customerBroadcast = customerMessages.find((m) => m.event === 'online_users_broadcast');
        const attendantBroadcast = attendantMessages.find((m) => m.event === 'online_users_broadcast');
        expect(customerBroadcast).toBeTruthy();
        expect(attendantBroadcast).toBeTruthy();

        // ── customer state (auto-processed via call_accepted event) ───
        expect(customerStores.callView.getState().viewState).toBe('in-call');
        expect(customerStores.call.getState().call).toBeTruthy();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('in-call');

        // ── attendant state (auto-processed via call_accepted event) ──
        expect(attendantStores.callView.getState().viewState).toBe('in-call');
        expect(attendantStores.call.getState().call).toBeTruthy();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('in-call');
    });

    it('after completeCall the attendant clears local state without notifying the customer directly', async () => {
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

        customerStores.currentUser.setState({ currentUser: mapUserToOnlineUser(customerUser) });
        customerStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });
        attendantStores.currentUser.setState({ currentUser: mapUserToOnlineUser(attendantUser) });
        attendantStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);

        onConnection()(customerWs);
        await flushPendingCalls();
        onConnection()(attendantWs);
        await flushPendingCalls();

        // ── send + accept ─────────────────────────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(customerUser._id, attendantUser._id);
        await new Promise((r) => setTimeout(r, 100));

        await attendantStores.call.getState().acceptIncomingCall();
        await new Promise((r) => setTimeout(r, 100));

        // ── both in-call (auto-processed via call_accepted) ───────────
        expect(attendantStores.callView.getState().viewState).toBe('in-call');
        expect(customerStores.callView.getState().viewState).toBe('in-call');

        // ── both receive online_users_broadcast after accept ─────────
        const customerAcceptBroadcast = customerMessages.find((m) => m.event === 'online_users_broadcast');
        const attendantAcceptBroadcast = attendantMessages.find((m) => m.event === 'online_users_broadcast');
        expect(customerAcceptBroadcast).toBeTruthy();
        expect(attendantAcceptBroadcast).toBeTruthy();

        // ── attendant completes call ──────────────────────────────────
        // completeCall() only leaves the Daily.co room locally now — freezing
        // the timer, charging tokens, flipping users idle, and propagating to
        // the other party is entirely driven by the Daily.co webhook chain
        // (participant.left → meeting.ended), not this REST/WS round trip.
        customerMessages.length = 0;
        attendantMessages.length = 0;

        attendantStores.call.getState().completeCall();
        await new Promise((r) => setTimeout(r, 100));

        // ── no call_completed is sent anymore from this local action ──
        const attendantCompleted = attendantMessages.find((m) => m.event === 'call_completed');
        const customerCompleted = customerMessages.find((m) => m.event === 'call_completed');
        expect(attendantCompleted).toBeUndefined();
        expect(customerCompleted).toBeUndefined();

        // ── attendant state cleared locally ────────────────────────────
        expect(attendantStores.call.getState().call).toBeNull();
        expect(attendantStores.callView.getState().viewState).toBe('none');

        // ── customer is untouched — they only learn about it via the
        //    Daily.co webhook chain, which this test doesn't simulate ────
        expect(customerStores.call.getState().call).not.toBeNull();
        expect(customerStores.callView.getState().viewState).toBe('in-call');
    });
});
