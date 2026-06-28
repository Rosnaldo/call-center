jest.mock('src/services/users');
jest.mock('@/src/services/online-users', () => ({ fetchOnlineUsers: jest.fn() }));
const mockSendIncomingCall = jest.fn();
const mockAcceptIncomingCall = jest.fn();
jest.mock('@/src/services/incoming-calls', () => ({
    sendIncomingCall: mockSendIncomingCall,
    cancelIncomingCall: jest.fn(),
    acceptIncomingCall: mockAcceptIncomingCall,
}));
const mockFetchCall = jest.fn();
jest.mock('@/src/services/calls', () => ({ fetchCall: mockFetchCall }));

import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser, mapUserToOnlineUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent, getIamPort } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer, linkRealtimeToIam } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { DailyTestService } from './helpers/daily-test-service';
import { deleteRoom } from './helpers/dailyco-room';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';

import * as usersService from 'src/services/users';
import * as onlineUsersService from '@/src/services/online-users';

const addToIamMock = usersService.addToIam as jest.Mock;
const findUserBySlugMock = usersService.findUserBySlug as jest.Mock;
const fetchOnlineUsersMock = onlineUsersService.fetchOnlineUsers as jest.Mock;

const pendingCalls: Array<Promise<unknown>> = [];

async function flushPendingCalls(): Promise<void> {
    const snapshot = [...pendingCalls];
    pendingCalls.length = 0;
    await Promise.all(snapshot);
}

function waitForMessage(messages: any[], event: string, timeout = 5000): Promise<any> {
    const existing = messages.find((m) => m.event === event);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            const msg = messages.find((m) => m.event === event);
            if (msg) { clearInterval(interval); resolve(msg); }
        }, 50);
        setTimeout(() => { clearInterval(interval); reject(new Error(`Timeout waiting for ${event}`)); }, timeout);
    });
}

// ─── suite ──────────────────────────────────────────────────────────────────

describe('Accept Call Flow (Daily.co webhooks)', () => {
    let iamRequest: IamAgent;
    let customerUser: IUser;
    let attendantUser: IUser;
    let dailyService: DailyTestService;
    let roomName: string;

    beforeAll(async () => {
        iamRequest = await startIamServer();
        linkRealtimeToIam(getIamPort(), CUSTOMER_TOKEN);
        const realtimeServer = await startRealtimeServer();

        const port = Number(realtimeServer.properties.port);
        dailyService = new DailyTestService(`http://localhost:${port}/webhooks/daily`);

        const users = await createMockUsers();
        customerUser = { ...users.customer, tokens: 10 };
        attendantUser = users.attendant;

        roomName = `${customerUser.slug}--${attendantUser.slug}`;
    });

    afterAll(async () => {
        await deleteRoom(roomName).catch(() => {});
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
        AuthSession.override({ token: CUSTOMER_TOKEN });

        addToIamMock.mockImplementation((user: IOnlineUser) => {
            const op = iamRequest.post('/online-users/add').set('Authorization', CUSTOMER_TOKEN).send(user);
            pendingCalls.push(op);
            return op;
        });

        findUserBySlugMock.mockImplementation(async (slug: string) => {
            const res = await iamRequest.get('/users/find-by-slug')
                .query({ slug }).set('Authorization', CUSTOMER_TOKEN);
            return res.body;
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
    });

    it('after accept both users join room and receive participant_joined', async () => {
        // ── connect WS clients & capture messages ─────────────────────
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

        // ── send incoming call ────────────────────────────────────────
        const sendStores = createStores(dailyService);
        sendStores.onlineUsers.setState({
            users: [mapUserToOnlineUser(customerUser), mapUserToOnlineUser(attendantUser)],
        });

        sendStores.incomingCall.getState().sendIncomingCall(customerUser._id, attendantUser._id);
        await new Promise((r) => setTimeout(r, 100));

        // ── accept call (attendant) ───────────────────────────────────
        const acceptMsg = attendantMessages.find((m) => m.event === 'incoming_call_received');
        expect(acceptMsg).toBeTruthy();

        await iamRequest.post('/incoming-calls/accept').set('Authorization', ATTENDANT_TOKEN)
            .send({ attendantId: attendantUser._id, userId: attendantUser._id });

        await new Promise((r) => setTimeout(r, 100));

        // ── both users receive call_accepted ──────────────────────────
        const customerAccepted = customerMessages.find((m) => m.event === 'call_accepted');
        const attendantAccepted = attendantMessages.find((m) => m.event === 'call_accepted');
        expect(customerAccepted).toBeTruthy();
        expect(attendantAccepted).toBeTruthy();

        // ── attendant joins (singletons → attendant) ──────────────────
        customerMessages.length = 0;
        attendantMessages.length = 0;

        const attendantStores = createStores(dailyService);
        attendantStores.currentUser.setState({
            currentUser: mapUserToOnlineUser(attendantUser),
        });

        attendantStores.call.getState().incomingCallAccepted(attendantAccepted.data.incomingCall);
        await waitForMessage(attendantMessages, 'participant_joined', 10000);

        const attJoinMsg = attendantMessages.find((m) => m.event === 'participant_joined');
        attendantStores.call.getState().updateJoinedView(attJoinMsg.data.call);
        await new Promise((r) => setTimeout(r, 100));

        expect(attendantStores.callView.getState().viewState).toBe('in-call');
        expect(attendantStores.call.getState().call).toBeTruthy();
        expect(attendantStores.call.getState().call!.attendantInCall).toBe(true);
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('in-call');

        // ── customer joins (singletons → customer) ────────────────────
        const customerStores = createStores(dailyService);
        customerStores.currentUser.setState({
            currentUser: mapUserToOnlineUser(customerUser),
        });

        customerStores.call.getState().incomingCallAccepted(customerAccepted.data.incomingCall);
        await waitForMessage(customerMessages, 'participant_joined', 10000);

        const custJoinMsg = customerMessages.find((m) => m.event === 'participant_joined');
        customerStores.call.getState().updateJoinedView(custJoinMsg.data.call);
        await new Promise((r) => setTimeout(r, 100));

        expect(customerStores.callView.getState().viewState).toBe('in-call');
        expect(customerStores.call.getState().call).toBeTruthy();
        expect(customerStores.call.getState().call!.customerInCall).toBe(true);
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('in-call');
    }, 30000);
});
