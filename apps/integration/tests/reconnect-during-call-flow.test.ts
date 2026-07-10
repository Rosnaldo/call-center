import { EventEmitter } from 'node:events';
import supertest from 'supertest';
import { IUser, mapUserToOnlineUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { simulateMessage, createWsClient } from './helpers/mock-wss';
import { DailyCoService } from './helpers/daily-service';

import { onConnection } from '../../realtime/src/websocket/connection';
import { graceTimer } from '../../realtime/src/websocket/grace_timer';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';
import { deleteDailyRoom } from '../../realtime/src/webhooks/daily_manager';

import { createStores, Stores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

import * as dailyServiceModule from '../../iam/src/services/daily';

// These Node-only WS test clients never actually join the real Daily room
// (only a browser's WebRTC client would), so IAM's SyncActiveCall would see
// empty room presence on every reconnect and tear the call down as if both
// parties had left for good (exactly the "alone" case covered in
// sync-active-call-flow.test.ts). In production the two are independent: a
// blip on the IAM websocket doesn't touch the separate, already-established
// Daily/WebRTC connection. So — like sync-active-call-flow.test.ts's "someone
// else is there" case — presence is stubbed for the whole suite to reflect
// both users still being genuinely present in the meeting throughout,
// which is what actually lets a reconnecting participant resume the call
// instead of it being (wrongly, for this test) reaped as abandoned.
async function wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

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

describe('Reconnect During Active Call Flow', () => {
    let iamRequest: IamAgent;
    let realtimeRequest: ReturnType<typeof supertest>;
    let customerUser: IUser;
    let attendantUser: IUser;
    let customerStores: Stores;
    let attendantStores: Stores;
    let roomName: string;
    let dailyCoService: DailyCoService;

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
        jest.restoreAllMocks();
        graceTimer.cancel(customerUser._id);
        graceTimer.cancel(attendantUser._id);
        await deleteDailyRoom(roomName);
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const icKeys = await redis.keys('incoming_call:*');
        if (icKeys.length) await redis.del(...icKeys);
        const callKeys = await redis.keys('calls:*');
        if (callKeys.length) await redis.del(...callKeys);
        const onlineKeys = await redis.keys('online_user:*');
        if (onlineKeys.length) await redis.del(...onlineKeys);

        clientRegistry.clear();
        jest.clearAllMocks();
        DailyCoService.reset();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        jest.spyOn(dailyServiceModule, 'getRoomPresenceUserIds').mockImplementation(async (room: string) =>
            room === roomName ? [customerUser._id, attendantUser._id] : [],
        );

        dailyCoService = DailyCoService.getInstance();
        customerStores = createStores(dailyCoService);
        attendantStores = createStores(dailyCoService);
    });

    const postDailyWebhook = async (body: Record<string, unknown>): Promise<void> => {
        await realtimeRequest.post('/webhooks/daily').send(body);
    };

    const getCallRecordFromRedis = async () => {
        return iamRequest.get('/calls/get-by-room').query({ roomName }).set('Authorization', CUSTOMER_TOKEN);
    };

    // Drives the same real send -> accept path exercised in
    // accept-call-flow.test.ts, so the call this test disrupts is the product
    // of the actual flow (real Daily room created via ensureDailyRoom, real
    // calls:* record) rather than one injected directly through IAM's API.
    const connectSendAndAccept = async () => {
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
        // see the analogous wait in accept-call-flow.test.ts — a broadcast-
        // triggered client refresh can otherwise clobber the onlineUsers
        // state set above before sendIncomingCall reads it.
        await waitFor(() =>
            customerStores.onlineUsers.getState().users.some((u) => u.id === attendantUser._id)
            && attendantStores.onlineUsers.getState().users.some((u) => u.id === customerUser._id),
        );

        customerStores.incomingCall.getState().sendIncomingCall(customerUser._id, attendantUser._id);
        await waitFor(() => attendantStores.callView.getState().viewState === 'awaiting-to-answer');

        await attendantStores.call.getState().acceptIncomingCall();
        // wait for the call object itself, not just the view state — they
        // don't necessarily land in the same tick, and asserting on
        // call.roomName right after this helper returns needs the former.
        await waitFor(() =>
            customerStores.callView.getState().viewState === 'in-call'
            && attendantStores.callView.getState().viewState === 'in-call'
            && customerStores.call.getState().call?.roomName === roomName
            && attendantStores.call.getState().call?.roomName === roomName,
        );

        return { customerWs, attendantWs, customerMessages, attendantMessages };
    };

    // Completes the call and drives it all the way through Daily's
    // meeting.ended webhook, mirroring accept-call-flow.test.ts's own
    // completeCall assertions — the point being to certify the call the
    // reconnect disrupted still winds down cleanly afterward, same as a call
    // that was never interrupted.
    const completeAndVerifyCleanEnd = async (customerMessages: any[], attendantMessages: any[]) => {
        customerMessages.length = 0;
        attendantMessages.length = 0;

        attendantStores.call.getState().completeCall();
        await waitFor(() =>
            customerMessages.some((m) => m.event === 'call_completed')
            && attendantMessages.some((m) => m.event === 'call_completed'),
        );

        expect(customerMessages.find((m) => m.event === 'call_completed')).toBeTruthy();
        expect(attendantMessages.find((m) => m.event === 'call_completed')).toBeTruthy();

        await postDailyWebhook({ type: 'meeting.ended', payload: { meeting_id: `m-${roomName}`, room: roomName, start_ts: Date.now() / 1000 } });
        await waitFor(() =>
            customerStores.call.getState().call === null
            && attendantStores.call.getState().call === null,
        );

        expect(customerStores.call.getState().call).toBeNull();
        expect(customerStores.callView.getState().viewState).toBe('none');
        expect(attendantStores.call.getState().call).toBeNull();
        expect(attendantStores.callView.getState().viewState).toBe('none');

        const res = await getCallRecordFromRedis();
        expect(res.body?.message).toBe('Call não encontrada');
    };

    it('attendant logs out mid-call but reconnects before the grace period expires — the call survives and completes normally', async () => {
        const { attendantWs, customerMessages, attendantMessages } = await connectSendAndAccept();

        const roomAtAccept = customerStores.call.getState().call?.roomName;
        expect(roomAtAccept).toBe(roomName);

        // ── attendant logs out mid-call ──────────────────────────────────
        customerMessages.length = 0;
        attendantMessages.length = 0;

        simulateMessage(attendantWs, { event: 'user_logout' });
        await wait(300);

        // logout still notifies the logging-out client directly...
        expect(attendantMessages.find((m) => m.event === 'user_logouted')).toBeTruthy();
        // ...then falls back to the normal disconnect chain (ws.terminate()
        // re-enters the 'close' handler), which — because there's an active
        // call — notifies the partner and starts the grace timer
        const disconnectingMsg = customerMessages.find((m) => m.event === 'user_disconnecting');
        expect(disconnectingMsg).toBeTruthy();
        expect(disconnectingMsg.data.call.roomName).toBe(roomName);
        expect(customerStores.callView.getState().viewState).toBe('call-interrupted');
        expect(graceTimer.has(attendantUser._id)).toBe(true);

        // the call record itself is untouched — nobody completed or deleted it
        const midDisconnectRes = await getCallRecordFromRedis();
        expect(midDisconnectRes.body?.isError).toBeFalsy();

        // ── attendant reconnects within the grace period ─────────────────
        customerMessages.length = 0;
        const { serverWs: attendantWs2, webFactory: attendantWebFactory2 } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);
        clientRegistry.add(attendantWs2);

        const attendantMessages2: any[] = [];
        (attendantWs2 as unknown as EventEmitter).on('sent', (data: string) => {
            attendantMessages2.push(JSON.parse(data));
        });

        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory2);

        await onConnection()(attendantWs2);
        await waitFor(() => attendantMessages2.some((m) => m.event === 'user_connected'));

        expect(graceTimer.has(attendantUser._id)).toBe(false);

        // customer is told the partner is back, with the call still intact
        const reconnectedMsg = customerMessages.find((m) => m.event === 'partner_reconnected');
        expect(reconnectedMsg).toBeTruthy();
        expect(reconnectedMsg.data.call.roomName).toBe(roomName);
        expect(customerStores.call.getState().call?.roomName).toBe(roomName);
        expect(customerStores.callView.getState().viewState).toBe('in-call');

        // the reconnecting attendant is kept on the same call — SyncActiveCall
        // keeps the record since (mocked) presence shows the meeting is still
        // happening. shouldJoin is false because presence also shows the
        // attendant's own Daily/WebRTC session never actually dropped (only
        // the IAM websocket did) — no redundant rejoin needed.
        const connectedMsg = attendantMessages2.find((m) => m.event === 'user_connected');
        expect(connectedMsg.data.shouldJoin).toBe(false);
        expect(connectedMsg.data.call.roomName).toBe(roomName);

        // and its own store actually resyncs from that payload — not just a
        // message sent into the void
        await waitFor(() => attendantStores.call.getState().call?.roomName === roomName);
        expect(attendantStores.callView.getState().viewState).toBe('in-call');

        // ── the call is still perfectly completable afterward ─────────────
        await completeAndVerifyCleanEnd(customerMessages, attendantMessages2);
    });

    it("attendant's connection drops mid-call but reconnects before the grace period expires — the call survives and completes normally", async () => {
        const { attendantWs, customerMessages, attendantMessages } = await connectSendAndAccept();

        expect(customerStores.call.getState().call?.roomName).toBe(roomName);

        // ── attendant's connection drops abruptly — no explicit logout ────
        customerMessages.length = 0;
        attendantMessages.length = 0;

        attendantWs.terminate();
        await wait(300);

        expect(customerMessages.find((m) => m.event === 'user_logouted')).toBeUndefined();
        const disconnectingMsg = customerMessages.find((m) => m.event === 'user_disconnecting');
        expect(disconnectingMsg).toBeTruthy();
        expect(disconnectingMsg.data.call.roomName).toBe(roomName);
        expect(customerStores.callView.getState().viewState).toBe('call-interrupted');
        expect(graceTimer.has(attendantUser._id)).toBe(true);

        const midDisconnectRes = await getCallRecordFromRedis();
        expect(midDisconnectRes.body?.isError).toBeFalsy();

        // ── attendant reconnects within the grace period ─────────────────
        customerMessages.length = 0;
        const { serverWs: attendantWs2, webFactory: attendantWebFactory2 } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);
        clientRegistry.add(attendantWs2);

        const attendantMessages2: any[] = [];
        (attendantWs2 as unknown as EventEmitter).on('sent', (data: string) => {
            attendantMessages2.push(JSON.parse(data));
        });

        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory2);

        await onConnection()(attendantWs2);
        await waitFor(() => attendantMessages2.some((m) => m.event === 'user_connected'));

        expect(graceTimer.has(attendantUser._id)).toBe(false);

        const reconnectedMsg = customerMessages.find((m) => m.event === 'partner_reconnected');
        expect(reconnectedMsg).toBeTruthy();
        expect(reconnectedMsg.data.call.roomName).toBe(roomName);
        expect(customerStores.call.getState().call?.roomName).toBe(roomName);
        expect(customerStores.callView.getState().viewState).toBe('in-call');

        // same reasoning as the logout case above: presence shows the
        // attendant's Daily/WebRTC session survived the drop, so no rejoin
        const connectedMsg = attendantMessages2.find((m) => m.event === 'user_connected');
        expect(connectedMsg.data.shouldJoin).toBe(false);
        expect(connectedMsg.data.call.roomName).toBe(roomName);

        await completeAndVerifyCleanEnd(customerMessages, attendantMessages2);
    });
});
