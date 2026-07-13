import { EventEmitter } from 'node:events';
import { IUser, mapUserToOnlineUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { createBridgedEventSource } from './helpers/mock-sse';
import { DailyCoService } from './helpers/daily-service';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';
import { deleteDailyRoom } from '../../realtime/src/webhooks/daily_manager';

import { createStores, Stores } from '../../web/src/states/stores';
import { getCallViewState } from '../../web/src/states/call-view/derive';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { initCallEvents } from '../../web/src/services/sse/init-call-events';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

import * as dailyServiceModule from '../../iam/src/services/daily';

// Exercises IAM's SyncActiveCall (apps/iam/src/controllers/call/sync_active_call.ts),
// which realtime's onConnection calls on every websocket connect (see
// apps/realtime/src/websocket/connection.ts). It reconciles a stale-looking
// call record against whether the Daily meeting is *actually* happening —
// the counterpart's presence specifically no longer matters, only whether
// the room has anyone in it at all:
//   - call exists, nobody is in the room -> meeting is over, the record
//     (and the Daily room) is torn down, the connecting user does not join
//   - call exists, someone is in the room -> the record is kept, the
//     connecting user is added as a participant, and always (re)joins —
//     grace_period.ts ejects a disconnecting user from Daily immediately
//     (see websocket/grace_period.ts), so a reconnecting user is always
//     genuinely out of the room by the time this fires, never a case of
//     "their own presence survived the blip"
//   - call doesn't exist, the room has presence -> self-healed into a new
//     record (redis lost the call state but the meeting is real), and the
//     connecting user is always told to join
//
// getRoomPresenceUserIds hits the real Daily.co API (no mock — see the other
// *-call-flow test files), which is exactly right for the "alone" case: no
// real WebRTC participant ever joins these Node-only tests, so presence is
// naturally empty. Cases needing someone actually present can't be produced
// for real the same way (that would need an actual WebRTC client), so those
// stub presence via jest.spyOn directly on the real module — not a parallel
// mock file — restored in afterEach.
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

describe('Sync Active Call on Connect', () => {
    let iamRequest: IamAgent;
    let customerUser: IUser;
    let attendantUser: IUser;
    let customerStores: Stores;
    let roomName: string;
    let dailyCoService: DailyCoService;
    // user_connected moved to the call-events SSE stream (call_synced — see
    // init-call-events.ts and IAM's /calls/sync-active-call route).
    // createBridgedEventSource bridges the real Redis channel into a real
    // InitCallEvents instance, same way createBridgedClient above bridges
    // the websocket, so the actual production dispatch logic still runs
    // end to end. Closed in afterEach.
    let sseCloses: Array<() => Promise<void>>;

    const bridgeCallEvents = async (user: IUser, token: string, stores: Stores): Promise<any[]> => {
        const { factory, messages, close } = await createBridgedEventSource(user._id);
        initCallEvents.init(token, stores, factory);
        sseCloses.push(close);
        return messages;
    };

    beforeAll(async () => {
        iamRequest = await startIamServer();
        await startRealtimeServer();

        const users = await createMockUsers();
        customerUser = users.customer;
        attendantUser = users.attendant;
        roomName = `${customerUser.slug}--${attendantUser.slug}`;
    });

    afterAll(async () => {
        stopRealtimeServer();
        await stopIamServer();
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await deleteDailyRoom(roomName);
        await Promise.all(sseCloses.map((close) => close()));
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const callKeys = await redis.keys('calls:*');
        if (callKeys.length) await redis.del(...callKeys);
        const onlineKeys = await redis.keys('online_user:*');
        if (onlineKeys.length) await redis.del(...onlineKeys);

        clientRegistry.clear();
        jest.clearAllMocks();
        DailyCoService.reset();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        sseCloses = [];
        dailyCoService = DailyCoService.getInstance();
        customerStores = createStores(dailyCoService);
        customerStores.currentUser.setState({ currentUser: mapUserToOnlineUser(customerUser) });
    });

    const createCallRecord = async (): Promise<void> => {
        await iamRequest.post('/calls/create').set('Authorization', CUSTOMER_TOKEN).send({
            id: `${customerUser._id}--${attendantUser._id}`,
            customerId: customerUser._id,
            customerName: `${customerUser.firstName} ${customerUser.lastName}`,
            attendantId: attendantUser._id,
            attendantName: `${attendantUser.firstName} ${attendantUser.lastName}`,
            roomName,
            activeUserIds: [],
            accumulatedMs: 0,
            overlapStartedAt: null,
            startedAt: null,
            endedAt: null,
            tokensToBeCharged: 0,
        });
    };

    const getCallRecordFromRedis = () => {
        return iamRequest.get('/calls/get-by-room').query({ roomName }).set('Authorization', CUSTOMER_TOKEN);
    };

    it('deletes the call and does not rejoin a meeting when the connecting user is alone', async () => {
        await createCallRecord();

        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        clientRegistry.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        // no jest.spyOn here — real Daily.co presence for this room is
        // empty, since no real WebRTC participant ever joined it
        await onConnection()(customerWs);

        const connectedMsg = customerCallEvents.find((m) => m.event === 'call_synced');
        expect(connectedMsg).toBeTruthy();
        expect(connectedMsg.data.call).toBeNull();

        // regression lock: the old websocket push is gone for good
        expect(customerMessages.find((m) => m.event === 'user_connected')).toBeUndefined();

        // the stale record (and the Daily room behind it) is torn down
        const res = await getCallRecordFromRedis();
        expect(res.body?.message).toBe('Call não encontrada');

        // client never joins a meeting — no call/viewState to sync into
        expect(customerStores.call.getState().call).toBeNull();
        expect(getCallViewState(customerStores)).toBe('none');
        expect(dailyCoService.joinCalls).toHaveLength(0);
    });

    it('keeps the call and joins the meeting when someone is present but the connecting user is not', async () => {
        await createCallRecord();

        // only the counterpart is in the room
        jest.spyOn(dailyServiceModule, 'getRoomPresenceUserIds').mockImplementation(async (room: string) =>
            room === roomName ? [attendantUser._id] : [],
        );

        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        clientRegistry.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        await onConnection()(customerWs);

        const connectedMsg = customerCallEvents.find((m) => m.event === 'call_synced');
        expect(connectedMsg).toBeTruthy();
        expect(connectedMsg.data.call).toBeTruthy();
        expect(connectedMsg.data.call.activeUserIds).toContain(customerUser._id);

        // the record persists, now with the connecting user added as a
        // participant (SyncActiveCall's addParticipant side effect)
        const res = await getCallRecordFromRedis();
        expect(res.body?.isError).toBeFalsy();
        expect(res.body?.activeUserIds).toContain(customerUser._id);

        // client actually (re)joins the meeting, and its own call object
        // shows the connecting user as a participant — not just the WS
        // payload/redis response checked above
        await waitFor(() => getCallViewState(customerStores) === 'in-call');
        expect(customerStores.call.getState().call).toBeTruthy();
        expect(customerStores.call.getState().call?.activeUserIds).toContain(customerUser._id);
        expect(dailyCoService.joinCalls).toHaveLength(1);
        expect(dailyCoService.joinCalls[0]).toMatchObject({ room: roomName, userId: customerUser._id });
    });

    it('keeps the call and rejoins even when the connecting user is already present in the room', async () => {
        await createCallRecord();

        // the connecting user's own Daily/WebRTC session apparently survived
        // the websocket blip — but grace_period.ts already ejects a
        // disconnecting user from Daily immediately (see websocket/grace_period.ts),
        // so this stale presence reading is never trusted: the client always
        // (re)joins regardless of what presence shows for itself.
        jest.spyOn(dailyServiceModule, 'getRoomPresenceUserIds').mockImplementation(async (room: string) =>
            room === roomName ? [customerUser._id] : [],
        );

        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        clientRegistry.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        await onConnection()(customerWs);

        const connectedMsg = customerCallEvents.find((m) => m.event === 'call_synced');
        expect(connectedMsg).toBeTruthy();
        expect(connectedMsg.data.call).toBeTruthy();

        // the record still persists (the meeting is real, someone's in it)
        const res = await getCallRecordFromRedis();
        expect(res.body?.isError).toBeFalsy();

        // always (re)joins now — no shouldJoin gate left to skip it
        await waitFor(() => dailyCoService.joinCalls.length === 1);
        expect(dailyCoService.joinCalls[0]).toMatchObject({ room: roomName, userId: customerUser._id });
    });

    it('self-heals a new call and joins when no record exists but presence shows the connecting user in a tracked room', async () => {
        // no createCallRecord() here — this is the "redis lost the call
        // state entirely" case selfHealFromPresence exists for (e.g. a
        // redis restart), reconstructed off Daily's own tracked rooms +
        // presence instead of an existing calls:* entry. The counterpart's
        // presence doesn't gate this — only whether the room has anyone
        // (the connecting user, at minimum) in it.
        await iamRequest.post('/calls/track-room').set('Authorization', CUSTOMER_TOKEN).send({ roomName });

        jest.spyOn(dailyServiceModule, 'getRoomPresenceUserIds').mockImplementation(async (room: string) =>
            room === roomName ? [customerUser._id] : [],
        );

        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        clientRegistry.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        await onConnection()(customerWs);

        const connectedMsg = customerCallEvents.find((m) => m.event === 'call_synced');
        expect(connectedMsg).toBeTruthy();
        expect(connectedMsg.data.call).toBeTruthy();
        expect(connectedMsg.data.call.roomName).toBe(roomName);
        expect(connectedMsg.data.call.activeUserIds).toEqual([customerUser._id]);

        // a brand new record now exists — there was none before this connect
        const res = await getCallRecordFromRedis();
        expect(res.body?.isError).toBeFalsy();
        expect(res.body?.customerId).toBe(customerUser._id);
        expect(res.body?.attendantId).toBe(attendantUser._id);
        expect(res.body?.activeUserIds).toEqual([customerUser._id]);

        // client joins the reconstructed meeting, with itself already shown
        // as a participant in its own call object
        await waitFor(() => getCallViewState(customerStores) === 'in-call');
        expect(customerStores.call.getState().call).toBeTruthy();
        expect(customerStores.call.getState().call?.activeUserIds).toContain(customerUser._id);
        expect(dailyCoService.joinCalls).toHaveLength(1);
        expect(dailyCoService.joinCalls[0]).toMatchObject({ room: roomName, userId: customerUser._id });
    });

    it('self-heals a new call with both participants when the counterpart is also present in the tracked room', async () => {
        await iamRequest.post('/calls/track-room').set('Authorization', CUSTOMER_TOKEN).send({ roomName });

        jest.spyOn(dailyServiceModule, 'getRoomPresenceUserIds').mockImplementation(async (room: string) =>
            room === roomName ? [customerUser._id, attendantUser._id] : [],
        );

        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        clientRegistry.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        await onConnection()(customerWs);

        const connectedMsg = customerCallEvents.find((m) => m.event === 'call_synced');
        expect(connectedMsg).toBeTruthy();
        expect(connectedMsg.data.call).toBeTruthy();
        expect(connectedMsg.data.call.roomName).toBe(roomName);
        expect(connectedMsg.data.call.activeUserIds).toEqual([customerUser._id, attendantUser._id]);

        const res = await getCallRecordFromRedis();
        expect(res.body?.isError).toBeFalsy();
        expect(res.body?.activeUserIds).toEqual([customerUser._id, attendantUser._id]);

        await waitFor(() => getCallViewState(customerStores) === 'in-call');
        expect(customerStores.call.getState().call).toBeTruthy();
        expect(dailyCoService.joinCalls).toHaveLength(1);
        expect(dailyCoService.joinCalls[0]).toMatchObject({ room: roomName, userId: customerUser._id });
    });

    // Exercises IAM's new NotifyPartnerReconnected controller directly —
    // this is what realtime's connection.ts calls (instead of doing its own
    // lookup + sendToUser) once its grace-timer bookkeeping detects a
    // genuine reconnect.
    describe('POST /calls/notify-partner-reconnected', () => {
        it('publishes update_call to the other participant when the user has an active call', async () => {
            await createCallRecord();
            const { messages: attendantEvents, close } = await createBridgedEventSource(attendantUser._id);

            try {
                const res = await iamRequest.post('/calls/notify-partner-reconnected')
                    .set('Authorization', CUSTOMER_TOKEN).send({ userId: customerUser._id });
                expect(res.body?.isError).toBeFalsy();

                await waitFor(() => attendantEvents.some((m) => m.event === 'update_call'));
                const msg = attendantEvents.find((m) => m.event === 'update_call');
                expect(msg.data.call.roomName).toBe(roomName);
            } finally {
                await close();
            }
        });

        it('no-ops when the user has no active call', async () => {
            const res = await iamRequest.post('/calls/notify-partner-reconnected')
                .set('Authorization', CUSTOMER_TOKEN).send({ userId: customerUser._id });

            expect(res.body?.isError).toBeFalsy();
        });
    });
});
