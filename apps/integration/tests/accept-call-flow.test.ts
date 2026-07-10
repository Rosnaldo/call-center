import { EventEmitter } from 'node:events';
import supertest from 'supertest';
import { IUser, mapUserToOnlineUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { DailyCoService } from './helpers/daily-service';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';
import { deleteDailyRoom } from '../../realtime/src/webhooks/daily_manager';

import { createStores, Stores } from '../../web/src/states/stores';
import { getCallViewState } from '../../web/src/states/call-view/derive';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

// src/services/users|calls (realtime) and @/src/services/api/{incoming-calls,calls,online-users}
// (web) are all real here — apiBack resolves baseURL/auth fresh per request
// (see apps/web/src/api/backend.ts), so WebProperties.override (already set
// by startIamServer()) + AuthSession.override below are enough; none of the
// IAM controllers behind these calls check the caller's token identity
// (accept.ts's customer/attendant check is a body-field comparison), so one
// shared token works regardless of which side triggers the call. Daily.co
// calls (webhooks/daily_manager, used by IAM's ensureDailyRoom and
// realtime's onMeetingEnded) are real too, against a dedicated test account —
// deleteDailyRoom in afterEach below cleans up the room this suite creates.

async function wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

// Several steps here chain through a real Daily.co call (network-bound,
// variable latency) — fixed waits aren't reliable, so poll for the actual
// end state instead of guessing a duration.
async function waitFor(condition: () => boolean, maxWaitMs = 10_000, stepMs = 100): Promise<void> {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
        if (condition()) return;
        await wait(stepMs);
    }
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
    let realtimeRequest: ReturnType<typeof supertest>;
    let customerUser: IUser;
    let attendantUser: IUser;
    let customerStores: Stores;
    let attendantStores: Stores;
    let roomName: string;

    beforeAll(async () => {
        iamRequest = await startIamServer();
        const webhookServer = await startRealtimeServer();
        realtimeRequest = supertest(webhookServer.app);

        const users = await createMockUsers();
        customerUser = { ...users.customer, tokens: 10 };
        attendantUser = users.attendant;
        roomName = `${customerUser.slug}--${attendantUser.slug}`;
    });

    afterAll(async () => {
        stopRealtimeServer();
        await stopIamServer();
    });

    afterEach(async () => {
        await deleteDailyRoom(roomName);
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const icKeys = await redis.keys('incoming_call:*');
        if (icKeys.length) await redis.del(...icKeys);
        const callKeys = await redis.keys('calls:*');
        if (callKeys.length) await redis.del(...callKeys);
        // /online-users/add preserves an existing 'in-call' status across a
        // reconnect (see add.ts) — without clearing this, a call left
        // in-call at the end of one test leaks into the next test's guards
        // (e.g. sendIncomingCall's "attendant busy" check)
        const onlineKeys = await redis.keys('online_user:*');
        if (onlineKeys.length) await redis.del(...onlineKeys);

        clientRegistry.clear();
        jest.clearAllMocks();
        DailyCoService.reset();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        const dailyService = DailyCoService.getInstance();
        customerStores = createStores(dailyService);
        attendantStores = createStores(dailyService);
    });

    const postDailyWebhook = async (body: Record<string, unknown>): Promise<void> => {
        await realtimeRequest.post('/webhooks/daily').send(body);
    };

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

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        // each onConnection() broadcasts online_users_broadcast, which
        // triggers every connected client's refreshUsers() fire-and-forget
        // (no promise onConnection() itself awaits) — without waiting for it
        // to settle, that real fetch can clobber the onlineUsers state set
        // above with a stale snapshot (e.g. admin's own connect firing a
        // refresh before attendant's addToIam has persisted), which then
        // fails sendIncomingCall's local "attendant exists" guard silently.
        await waitFor(() =>
            customerStores.onlineUsers.getState().users.some((u) => u.id === attendantUser._id)
            && attendantStores.onlineUsers.getState().users.some((u) => u.id === customerUser._id),
        );

        // ── send incoming call ────────────────────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(customerUser._id, attendantUser._id);
        await waitFor(() => attendantMessages.some((m) => m.event === 'incoming_call_received'));

        // ── accept call ───────────────────────────────────────────────
        const acceptMsg = attendantMessages.find((m) => m.event === 'incoming_call_received');
        expect(acceptMsg).toBeTruthy();

        customerMessages.length = 0;
        attendantMessages.length = 0;

        await attendantStores.call.getState().acceptIncomingCall();
        await waitFor(() =>
            getCallViewState(customerStores) === 'in-call'
            && getCallViewState(attendantStores) === 'in-call',
        );

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
        expect(getCallViewState(customerStores)).toBe('in-call');
        expect(customerStores.call.getState().call).toBeTruthy();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('in-call');

        // ── attendant state (auto-processed via call_accepted event) ──
        expect(getCallViewState(attendantStores)).toBe('in-call');
        expect(attendantStores.call.getState().call).toBeTruthy();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('in-call');
    });

    it('after completeCall both parties are notified and clear local state', async () => {
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

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        // see the comment on the analogous wait in the previous test — a
        // broadcast-triggered client refresh can otherwise clobber the
        // onlineUsers state set above before sendIncomingCall reads it.
        await waitFor(() =>
            customerStores.onlineUsers.getState().users.some((u) => u.id === attendantUser._id)
            && attendantStores.onlineUsers.getState().users.some((u) => u.id === customerUser._id),
        );

        // ── send + accept ─────────────────────────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(customerUser._id, attendantUser._id);
        await waitFor(() => getCallViewState(attendantStores) === 'awaiting-to-answer');

        await attendantStores.call.getState().acceptIncomingCall();
        await waitFor(() =>
            getCallViewState(customerStores) === 'in-call'
            && getCallViewState(attendantStores) === 'in-call',
        );

        // ── both in-call (auto-processed via call_accepted) ───────────
        expect(getCallViewState(attendantStores)).toBe('in-call');
        expect(getCallViewState(customerStores)).toBe('in-call');

        // ── both receive online_users_broadcast after accept ─────────
        const customerAcceptBroadcast = customerMessages.find((m) => m.event === 'online_users_broadcast');
        const attendantAcceptBroadcast = attendantMessages.find((m) => m.event === 'online_users_broadcast');
        expect(customerAcceptBroadcast).toBeTruthy();
        expect(attendantAcceptBroadcast).toBeTruthy();

        // ── attendant completes call ──────────────────────────────────
        // completeCall() calls IAM's /calls/complete, which broadcasts
        // call_completed back to both parties (each opens the calculation
        // modal on receipt) — the actual state clear only happens once
        // Daily's own meeting.ended webhook arrives and onMeetingEnded
        // broadcasts meeting_ended.
        customerMessages.length = 0;
        attendantMessages.length = 0;

        attendantStores.call.getState().completeCall();
        await waitFor(() =>
            customerMessages.some((m) => m.event === 'call_completed')
            && attendantMessages.some((m) => m.event === 'call_completed'),
        );

        // ── both sides receive call_completed ──────────────────────────
        const attendantCompleted = attendantMessages.find((m) => m.event === 'call_completed');
        const customerCompleted = customerMessages.find((m) => m.event === 'call_completed');
        expect(attendantCompleted).toBeTruthy();
        expect(customerCompleted).toBeTruthy();

        await postDailyWebhook({ type: 'meeting.ended', payload: { meeting_id: 'm-accept-1', room: roomName, start_ts: Date.now() / 1000 } });
        await waitFor(() =>
            customerStores.call.getState().call === null
            && attendantStores.call.getState().call === null,
        );

        // ── both sides clear local state ────────────────────────────────
        expect(attendantStores.call.getState().call).toBeNull();
        expect(getCallViewState(attendantStores)).toBe('none');

        expect(customerStores.call.getState().call).toBeNull();
        expect(getCallViewState(customerStores)).toBe('none');
    });
});
