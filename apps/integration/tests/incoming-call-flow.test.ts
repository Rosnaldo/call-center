import { EventEmitter } from 'node:events';
import { IUser, mapUserToOnlineUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { createBridgedEventSource } from './helpers/mock-sse';
import { createBridgedRealtimeEventSource } from './helpers/mock-realtime-sse';
import { DailyCoService } from './helpers/daily-service';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';
import { deleteDailyRoom } from '../../realtime/src/webhooks/daily_manager';

import { createStores, Stores } from '../../web/src/states/stores';
import { getCallViewState } from '../../web/src/states/call-view/derive';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { initCallEvents } from '../../web/src/services/sse/init-call-events';
import { initRealtimeEvents } from '../../web/src/services/sse/init-realtime-events';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

// src/services/users|calls (realtime) and @/src/services/api/incoming-calls
// (web) are all real here — apiBack already resolves baseURL/auth fresh per
// request (see apps/web/src/api/backend.ts), so WebProperties.override
// (already set by startIamServer()) + AuthSession.override below are enough,
// no mocking needed. But several actions in this file (the incoming-call
// send/cancel actions below) kick off async work the test has no promise to
// await directly — sendIncomingCall in particular chains several real hops
// (customer -> IAM -> IAM publishes to Redis -> both clients' bridged
// call-events subscriber -> updateIncomingCall/incomingCallReceived, plus a
// separate update_online_users push over the realtime-events stream) before
// the stores settle. setImmediate yields to the event loop's poll phase
// without needing real wall time to pass, so polling a condition with it is
// both fast and reliable regardless of how many hops a given action ends up
// chaining.
async function flushRealIO(ticks = 30): Promise<void> {
    for (let i = 0; i < ticks; i++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
}

async function waitFor(condition: () => boolean | Promise<boolean>, maxTicks = 300): Promise<void> {
    for (let i = 0; i < maxTicks; i++) {
        if (await condition()) return;
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
    // let the final assertion produce the real failure message/diff
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
    // send/cancel/accept no longer push over the websocket — IAM publishes
    // straight to Redis and web listens over SSE instead (see
    // init-call-events.ts). createBridgedEventSource bridges that same real
    // Redis channel into a real InitCallEvents instance the same way
    // createBridgedClient above bridges the websocket, so the actual
    // production dispatch logic still runs end to end. Closed in afterEach.
    let sseCloses: Array<() => Promise<void>>;

    const bridgeCallEvents = async (user: IUser, token: string, stores: Stores): Promise<any[]> => {
        const { factory, messages, close } = await createBridgedEventSource(user._id);
        initCallEvents.init(token, stores, factory);
        sseCloses.push(close);
        return messages;
    };

    // update_online_users moved off the websocket onto realtime's own
    // realtime-events SSE stream — see init-realtime-events.ts.
    const bridgeRealtimeEvents = async (user: IUser, token: string, stores: Stores): Promise<any[]> => {
        const { factory, messages, close } = await createBridgedRealtimeEventSource(user._id);
        initRealtimeEvents.init(token, stores, factory);
        sseCloses.push(close);
        return messages;
    };

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

    afterEach(async () => {
        // only the cancel-after-accept test below actually calls
        // /incoming-calls/accept (which real ensureDailyRoom's a room for
        // this pair) — harmless no-op for the others, deleteDailyRoom
        // tolerates a room that was never created
        await deleteDailyRoom(`${customerUser.slug}--${attendantUser.slug}`);
        await Promise.all(sseCloses.map((close) => close()));
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const icKeys = await redis.keys('incoming_call:*');
        if (icKeys.length) await redis.del(...icKeys);
        // addOnlineUser preserves an existing 'in-call'/'occupied' status
        // across a reconnect (see online_users_redis.ts) — without clearing this, status
        // left by one test leaks into the next test's guards (e.g.
        // sendIncomingCall's "attendant busy" check)
        const onlineKeys = await redis.keys('online_user:*');
        if (onlineKeys.length) await redis.del(...onlineKeys);
        // a call accepted in one test (see the cancel-after-accept test
        // below) would otherwise leak into the next test's cancel guard
        const callKeys = await redis.keys('calls:*');
        if (callKeys.length) await redis.del(...callKeys);

        clientRegistry.clear();
        jest.clearAllMocks();
        DailyCoService.reset();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        sseCloses = [];
        const dailyService = DailyCoService.getInstance();
        customerStores = createStores(dailyService);
        attendantStores = createStores(dailyService);

        customerStores.currentUser.setState({ currentUser: mapUserToOnlineUser(customerUser) });
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
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantCallEvents = await bridgeCallEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);
        const customerRealtimeEvents = await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantRealtimeEvents = await bridgeRealtimeEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        await flushRealIO();

        // ── customer triggers sendIncomingCall ────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        // viewState flips as soon as update_incomingcall arrives, but
        // update_online_users is a separate SSE push (fed by IAM's own async
        // round trip before it publishes) — wait on the onlineUsers status
        // instead, since that's what the assertions below actually depend on.
        await waitFor(() =>
            customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status === 'occupied'
            && attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status === 'occupied',
        );

        // ── both receive events (via the call-events Redis pub/sub bridge) ──
        // incoming_call_sent was removed — the caller has no side effect of
        // its own beyond the state carried by update_incomingcall below.
        const sentMsg = customerCallEvents.find((m) => m.event === 'update_incomingcall');
        const recvMsg = attendantCallEvents.find((m) => m.event === 'incoming_call_received');
        expect(sentMsg).toBeTruthy();
        expect(recvMsg).toBeTruthy();

        // ── both receive update_online_users ─────────────────────
        const customerBroadcast = customerRealtimeEvents.find((m) => m.event === 'update_online_users');
        const attendantBroadcast = attendantRealtimeEvents.find((m) => m.event === 'update_online_users');
        expect(customerBroadcast).toBeTruthy();
        expect(attendantBroadcast).toBeTruthy();

        // ── customer state (auto-processed via update_incomingcall) ────
        expect(customerStores.incomingCall.getState().incomingCall).toBeTruthy();
        expect(customerStores.incomingCall.getState().incomingCall!.customerId).toBe(customerUser._id);
        expect(customerStores.incomingCall.getState().incomingCall!.attendantId).toBe(attendantUser._id);
        expect(getCallViewState(customerStores)).toBe('awaiting-answer');
        expect(customerStores.call.getState().call).toBeNull();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('occupied');

        // ── attendant state (auto-processed via incoming_call_received)
        expect(attendantStores.incomingCall.getState().incomingCall).toBeTruthy();
        expect(attendantStores.incomingCall.getState().incomingCall!.customerId).toBe(customerUser._id);
        expect(attendantStores.incomingCall.getState().incomingCall!.attendantId).toBe(attendantUser._id);
        expect(getCallViewState(attendantStores)).toBe('awaiting-to-answer');
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
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantCallEvents = await bridgeCallEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);
        const customerRealtimeEvents = await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantRealtimeEvents = await bridgeRealtimeEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        await flushRealIO();

        // ── send incoming call ────────────────────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        await waitFor(() =>
            customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status === 'occupied'
            && attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status === 'occupied',
        );

        expect(getCallViewState(customerStores)).toBe('awaiting-answer');

        // ── customer cancels ──────────────────────────────────────────
        customerMessages.length = 0;
        attendantMessages.length = 0;
        customerCallEvents.length = 0;
        attendantCallEvents.length = 0;
        customerRealtimeEvents.length = 0;
        attendantRealtimeEvents.length = 0;

        // cancelIncomingCall() no longer sets viewState optimistically (see
        // actions.ts) — the real state clear only happens once IAM's own
        // incoming_call_cancelled pub/sub event round-trips back to this
        // same client, so wait on the actual broadcast message arriving, and
        // on the status reset that the receiving incomingCallCancelled
        // handler applies last, after its own internal await
        // fetchOnlineUsers() resolves.
        customerStores.incomingCall.getState().cancelIncomingCall();
        await waitFor(() =>
            customerCallEvents.some((m) => m.event === 'incoming_call_cancelled')
            && attendantCallEvents.some((m) => m.event === 'incoming_call_cancelled')
            && customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status === 'idle'
            && attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status === 'idle',
        );

        const customerCancelMsg = customerCallEvents.find((m) => m.event === 'incoming_call_cancelled');
        const attendantCancelMsg = attendantCallEvents.find((m) => m.event === 'incoming_call_cancelled');
        expect(customerCancelMsg).toBeTruthy();
        expect(attendantCancelMsg).toBeTruthy();

        // ── both receive update_online_users after cancel ─────────
        const customerBroadcast = customerRealtimeEvents.find((m) => m.event === 'update_online_users');
        const attendantBroadcast = attendantRealtimeEvents.find((m) => m.event === 'update_online_users');
        expect(customerBroadcast).toBeTruthy();
        expect(attendantBroadcast).toBeTruthy();

        // ── customer state cleared (auto-processed) ───────────────────
        expect(customerStores.incomingCall.getState().incomingCall).toBeNull();
        expect(getCallViewState(customerStores)).toBe('none');
        expect(customerStores.callView.getState().selectedAttendantId).toBeNull();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('idle');

        // ── attendant state cleared (auto-processed) ──────────────────
        expect(attendantStores.incomingCall.getState().incomingCall).toBeNull();
        expect(getCallViewState(attendantStores)).toBe('none');
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
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantCallEvents = await bridgeCallEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);
        const customerRealtimeEvents = await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantRealtimeEvents = await bridgeRealtimeEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        await flushRealIO();

        // ── send incoming call ────────────────────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        await waitFor(() =>
            customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status === 'occupied'
            && attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status === 'occupied',
        );

        expect(getCallViewState(attendantStores)).toBe('awaiting-to-answer');

        // ── attendant cancels ─────────────────────────────────────────
        customerMessages.length = 0;
        attendantMessages.length = 0;
        customerCallEvents.length = 0;
        attendantCallEvents.length = 0;
        customerRealtimeEvents.length = 0;
        attendantRealtimeEvents.length = 0;

        // cancelIncomingCall() no longer sets viewState optimistically (see
        // actions.ts) — the real state clear only happens once IAM's own
        // incoming_call_cancelled pub/sub event round-trips back to this
        // same client, so wait on the actual broadcast message arriving, and
        // on the status reset that the receiving incomingCallCancelled
        // handler applies last, after its own internal await
        // fetchOnlineUsers() resolves.
        attendantStores.incomingCall.getState().cancelIncomingCall();
        await waitFor(() =>
            customerCallEvents.some((m) => m.event === 'incoming_call_cancelled')
            && attendantCallEvents.some((m) => m.event === 'incoming_call_cancelled')
            && customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status === 'idle'
            && attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status === 'idle',
        );

        const attendantCancelMsg = attendantCallEvents.find((m) => m.event === 'incoming_call_cancelled');
        const customerCancelMsg = customerCallEvents.find((m) => m.event === 'incoming_call_cancelled');
        expect(attendantCancelMsg).toBeTruthy();
        expect(customerCancelMsg).toBeTruthy();

        // ── both receive update_online_users after cancel ─────────
        const customerBroadcast = customerRealtimeEvents.find((m) => m.event === 'update_online_users');
        const attendantBroadcast = attendantRealtimeEvents.find((m) => m.event === 'update_online_users');
        expect(customerBroadcast).toBeTruthy();
        expect(attendantBroadcast).toBeTruthy();

        // ── attendant state cleared (auto-processed) ──────────────────
        expect(attendantStores.incomingCall.getState().incomingCall).toBeNull();
        expect(getCallViewState(attendantStores)).toBe('none');
        expect(attendantStores.callView.getState().selectedAttendantId).toBeNull();
        expect(attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status).toBe('idle');

        // ── customer state cleared (auto-processed) ───────────────────
        expect(customerStores.incomingCall.getState().incomingCall).toBeNull();
        expect(getCallViewState(customerStores)).toBe('none');
        expect(customerStores.callView.getState().selectedAttendantId).toBeNull();
        expect(customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status).toBe('idle');
    });

    it('cancel is rejected once the incoming call has already been accepted', async () => {
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
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantCallEvents = await bridgeCallEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);
        const customerRealtimeEvents = await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantRealtimeEvents = await bridgeRealtimeEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        // each onConnection() broadcasts update_online_users, which applies
        // directly to onlineUsers state (no follow-up fetch anymore) —
        // without waiting for it to settle, that push can still clobber the
        // onlineUsers state set above before sendIncomingCall reads it (see
        // the analogous fix in accept-call-flow.test.ts).
        await flushRealIO();

        // ── send + accept — the incoming call becomes an active call ────
        customerStores.incomingCall.getState().sendIncomingCall(customerUser._id, attendantUser._id);
        await waitFor(() => getCallViewState(attendantStores) === 'awaiting-to-answer');

        // accept.ts creates the calls:* record synchronously and in-process
        // now (see ensure_call_record.ts) — no more realtime round trip to
        // wait out, the record is guaranteed to exist once this responds.
        const roomName = `${customerUser.slug}--${attendantUser.slug}`;
        await iamRequest.post('/incoming-calls/accept').set('Authorization', ATTENDANT_TOKEN)
            .send({ attendantId: attendantUser._id, userId: attendantUser._id });

        const acceptedCall = await iamRequest.get('/calls/get-by-room')
            .query({ roomName }).set('Authorization', CUSTOMER_TOKEN);
        expect(acceptedCall.body?.isError).toBeFalsy();

        customerMessages.length = 0;
        attendantMessages.length = 0;
        customerCallEvents.length = 0;
        attendantCallEvents.length = 0;
        customerRealtimeEvents.length = 0;
        attendantRealtimeEvents.length = 0;

        // ── cancel is now rejected — the endpoint refuses outright ───────
        const cancelRes = await iamRequest.post('/incoming-calls/cancel').set('Authorization', CUSTOMER_TOKEN)
            .send({ customerId: customerUser._id, attendantId: attendantUser._id });

        expect(cancelRes.status).toBe(400);
        expect(cancelRes.body?.isError).toBe(true);

        // the call it would have deleted is untouched
        const stillThere = await iamRequest.get('/calls/get-by-room')
            .query({ roomName }).set('Authorization', CUSTOMER_TOKEN);
        expect(stillThere.body?.isError).toBeFalsy();
        expect(stillThere.body?.roomName).toBe(roomName);

        // rejected before ever notifying — neither side hears about a cancel
        expect(customerCallEvents.find((m) => m.event === 'incoming_call_cancelled')).toBeUndefined();
        expect(attendantCallEvents.find((m) => m.event === 'incoming_call_cancelled')).toBeUndefined();
    });
});
