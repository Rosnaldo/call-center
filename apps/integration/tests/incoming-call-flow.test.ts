import { EventEmitter } from 'node:events';
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

// src/services/users|calls (realtime) and @/src/services/api/{incoming-calls,online-users}
// (web) are all real here — apiBack already resolves baseURL/auth fresh per
// request (see apps/web/src/api/backend.ts), so WebProperties.override
// (already set by startIamServer()) + AuthSession.override below are enough,
// no mocking needed. But several actions in this file (broadcastMessage's
// client-side refreshUsers(), and the incoming-call send/cancel actions
// below) kick off async work the test has no promise to await directly —
// sendIncomingCall in particular chains several real HTTP hops (customer ->
// IAM -> IAM's webhook -> realtime -> both clients' incomingCallSent/
// Received, which each also call fetchOnlineUsers) before the stores settle.
// setImmediate yields to the event loop's poll phase without needing real
// wall time to pass, so polling a condition with it is both fast and
// reliable regardless of how many hops a given action ends up chaining.
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
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const icKeys = await redis.keys('incoming_call:*');
        if (icKeys.length) await redis.del(...icKeys);
        // /online-users/add preserves an existing 'in-call'/'occupied' status
        // across a reconnect (see add.ts) — without clearing this, status
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

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        await flushRealIO();

        // ── customer triggers sendIncomingCall ────────────────────────
        customerStores.incomingCall.getState().sendIncomingCall(
            customerUser._id,
            attendantUser._id,
        );
        // viewState is set synchronously at the start of incomingCallSent/
        // Received, before their internal `await fetchOnlineUsers()` — wait
        // on the onlineUsers status instead, since that's set last and is
        // what the assertions below actually depend on.
        await waitFor(() =>
            customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status === 'occupied'
            && attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status === 'occupied',
        );

        // ── both receive events ──────────────────────────────────────
        const sentMsg = customerMessages.find((m) => m.event === 'incoming_call_sent');
        const recvMsg = attendantMessages.find((m) => m.event === 'incoming_call_received');
        expect(sentMsg).toBeTruthy();
        expect(recvMsg).toBeTruthy();

        // ── both receive online_users_broadcast ─────────────────────
        const customerBroadcast = customerMessages.find((m) => m.event === 'online_users_broadcast');
        const attendantBroadcast = attendantMessages.find((m) => m.event === 'online_users_broadcast');
        expect(customerBroadcast).toBeTruthy();
        expect(attendantBroadcast).toBeTruthy();

        // ── customer state (auto-processed via incoming_call_sent) ────
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

        // cancelIncomingCall() sets viewState locally/optimistically before
        // the network round trip even starts, so it can't be used as a
        // "the real cancel round trip finished" signal — wait on the actual
        // broadcast message arriving, and on the status reset that the
        // receiving incomingCallCancelled handler applies last, after its
        // own internal await fetchOnlineUsers() resolves.
        customerStores.incomingCall.getState().cancelIncomingCall();
        await waitFor(() =>
            customerMessages.some((m) => m.event === 'incoming_call_cancelled')
            && attendantMessages.some((m) => m.event === 'incoming_call_cancelled')
            && customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status === 'idle'
            && attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status === 'idle',
        );

        const customerCancelMsg = customerMessages.find((m) => m.event === 'incoming_call_cancelled');
        const attendantCancelMsg = attendantMessages.find((m) => m.event === 'incoming_call_cancelled');
        expect(customerCancelMsg).toBeTruthy();
        expect(attendantCancelMsg).toBeTruthy();

        // ── both receive online_users_broadcast after cancel ─────────
        const customerBroadcast = customerMessages.find((m) => m.event === 'online_users_broadcast');
        const attendantBroadcast = attendantMessages.find((m) => m.event === 'online_users_broadcast');
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

        // cancelIncomingCall() sets viewState locally/optimistically before
        // the network round trip even starts, so it can't be used as a
        // "the real cancel round trip finished" signal — wait on the actual
        // broadcast message arriving, and on the status reset that the
        // receiving incomingCallCancelled handler applies last, after its
        // own internal await fetchOnlineUsers() resolves.
        attendantStores.incomingCall.getState().cancelIncomingCall();
        await waitFor(() =>
            customerMessages.some((m) => m.event === 'incoming_call_cancelled')
            && attendantMessages.some((m) => m.event === 'incoming_call_cancelled')
            && customerStores.onlineUsers.getState().users.find((u) => u.id === customerUser._id)?.status === 'idle'
            && attendantStores.onlineUsers.getState().users.find((u) => u.id === attendantUser._id)?.status === 'idle',
        );

        const attendantCancelMsg = attendantMessages.find((m) => m.event === 'incoming_call_cancelled');
        const customerCancelMsg = customerMessages.find((m) => m.event === 'incoming_call_cancelled');
        expect(attendantCancelMsg).toBeTruthy();
        expect(customerCancelMsg).toBeTruthy();

        // ── both receive online_users_broadcast after cancel ─────────
        const customerBroadcast = customerMessages.find((m) => m.event === 'online_users_broadcast');
        const attendantBroadcast = attendantMessages.find((m) => m.event === 'online_users_broadcast');
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

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        // each onConnection() broadcasts online_users_broadcast, which
        // triggers every connected client's refreshUsers() fire-and-forget
        // — without waiting for it to settle, that real fetch can clobber
        // the onlineUsers state set above before sendIncomingCall reads it
        // (see the analogous fix in accept-call-flow.test.ts).
        await flushRealIO();

        // ── send + accept — the incoming call becomes an active call ────
        customerStores.incomingCall.getState().sendIncomingCall(customerUser._id, attendantUser._id);
        await waitFor(() => getCallViewState(attendantStores) === 'awaiting-to-answer');

        await iamRequest.post('/incoming-calls/accept').set('Authorization', ATTENDANT_TOKEN)
            .send({ attendantId: attendantUser._id, userId: attendantUser._id });

        // Accept itself doesn't create the calls:* record — it fires
        // notifyCallAccepted fire-and-forget, and realtime's onCallAccepted
        // handler (ensureCallExists) creates it asynchronously afterward,
        // so the record isn't guaranteed to exist the instant accept's HTTP
        // response comes back.
        const roomName = `${customerUser.slug}--${attendantUser.slug}`;
        let acceptedCall: Awaited<ReturnType<typeof iamRequest.get>>;
        await waitFor(async () => {
            acceptedCall = await iamRequest.get('/calls/get-by-room')
                .query({ roomName }).set('Authorization', CUSTOMER_TOKEN);
            return !acceptedCall.body?.isError;
        });
        expect(acceptedCall!.body?.isError).toBeFalsy();

        customerMessages.length = 0;
        attendantMessages.length = 0;

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
        expect(customerMessages.find((m) => m.event === 'incoming_call_cancelled')).toBeUndefined();
        expect(attendantMessages.find((m) => m.event === 'incoming_call_cancelled')).toBeUndefined();
    });
});
