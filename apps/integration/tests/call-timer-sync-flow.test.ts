import { EventEmitter } from 'node:events';
import supertest from 'supertest';
import { IUser, getCallElapsedMs } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { createBridgedEventSource } from './helpers/mock-sse';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';
import { deleteDailyRoom } from '../../realtime/src/webhooks/daily_manager';

import { createStores, Stores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { initCallEvents } from '../../web/src/services/sse/init-call-events';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

// src/services/users|calls (realtime) and @/src/services/api/calls (web) are
// all real here — apiBack resolves baseURL/auth fresh per request (see
// apps/web/src/api/backend.ts), so WebProperties.override (already set by
// startIamServer()) + AuthSession.override below are enough, no mocking
// needed. Daily.co calls (webhooks/daily_manager) are real too, against a
// dedicated test account — deleteDailyRoom in afterEach below cleans up the
// room this suite creates.

async function wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
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

describe('Call Timer Sync Flow — accumulatedMs integrity', () => {
    let iamRequest: IamAgent;
    let realtimeRequest: ReturnType<typeof supertest>;
    let customerUser: IUser;
    let attendantUser: IUser;
    let customerStores: Stores;
    let attendantStores: Stores;
    let roomName: string;
    // Participant add/remove now only ever surface as update_call on the
    // call-events SSE stream (see init-call-events.ts and IAM's
    // /calls/add-participant, /calls/remove-participant routes) — this
    // suite's call-state assertions depend on that stream being bridged for
    // both users.
    let sseCloses: Array<() => Promise<void>>;

    const bridgeCallEvents = async (user: IUser, token: string, stores: Stores): Promise<any[]> => {
        const { factory, messages, close } = await createBridgedEventSource(user._id);
        initCallEvents.init(token, stores, factory);
        sseCloses.push(close);
        return messages;
    };

    beforeAll(async () => {
        iamRequest = await startIamServer();
        const webhookServer = await startRealtimeServer();
        realtimeRequest = supertest(webhookServer.app);

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
        await deleteDailyRoom(roomName);
        await Promise.all(sseCloses.map((close) => close()));
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const callKeys = await redis.keys('calls:*');
        if (callKeys.length) await redis.del(...callKeys);

        clientRegistry.clear();
        jest.clearAllMocks();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        sseCloses = [];
        customerStores = createStores();
        attendantStores = createStores();
    });

    const postDailyWebhook = async (body: Record<string, unknown>): Promise<void> => {
        await realtimeRequest.post('/webhooks/daily').send(body);
        // handlers are fire-and-forget on the express route — give the
        // background async chain (findUserBySlug + calls HTTP round-trips) time to settle
        await wait(100);
    };

    const joinPayload = (user: IUser) => ({
        type: 'participant.joined',
        payload: {
            session_id: `session-${user._id}`,
            room: roomName,
            user_id: user._id,
            user_name: `${user.firstName} ${user.lastName}`,
            joined_at: Date.now() / 1000,
        },
    });

    const leavePayload = (user: IUser) => ({
        type: 'participant.left',
        payload: {
            session_id: `session-${user._id}`,
            room: roomName,
            user_id: user._id,
            user_name: `${user.firstName} ${user.lastName}`,
            joined_at: Date.now() / 1000,
        },
    });

    // Mirrors the play/stop + elapsedSeconds computation useBillingTimer.ts
    // does in a React effect — applied here directly to each side's own
    // `timer` store, since this suite runs in a plain Node (non-jsdom) jest
    // environment where the hook itself can't be mounted.
    const syncTimerStore = (stores: Stores): void => {
        const call = stores.call.getState().call;
        if (!call) {
            stores.timer.getState().reset();
            return;
        }
        // The real app drives play/stop off Daily.co's own remote-participant
        // presence now (see useTimerFromRemoteParticipant), not off a backend
        // flag — overlapStartedAt is the equivalent proxy here since it only
        // ever transitions on the same participant join/leave webhooks.
        if (call.overlapStartedAt !== null) {
            stores.timer.getState().play();
        } else {
            stores.timer.getState().stop();
        }
        stores.timer.setState({ elapsedSeconds: Math.floor(getCallElapsedMs(call) / 1000) });
    };

    const expectTimersSynced = (): void => {
        syncTimerStore(customerStores);
        syncTimerStore(attendantStores);
        expect(customerStores.timer.getState().status).toBe(attendantStores.timer.getState().status);
        expect(customerStores.timer.getState().elapsedSeconds).toBe(attendantStores.timer.getState().elapsedSeconds);
    };

    it('freezes accumulatedMs while the attendant is temporarily away and resyncs both users on rejoin', async () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantCallEvents = await bridgeCallEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);

        await onConnection()(customerWs);
        await onConnection()(attendantWs);

        // ── call already exists in IAM, same as after an incoming-call accept ──
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

        // ── meeting starts, customer joins alone ──────────────────────────
        await postDailyWebhook({ type: 'meeting.started', payload: { meeting_id: 'm-1', room: roomName, start_ts: Date.now() / 1000 } });
        await postDailyWebhook(joinPayload(customerUser));

        let call = customerStores.call.getState().call;
        expect(call).toBeTruthy();
        expect(call!.activeUserIds).toEqual([customerUser._id]);
        expect(call!.overlapStartedAt).toBeNull();
        expect(attendantStores.call.getState().call).toEqual(call);
        expectTimersSynced();
        expect(customerStores.timer.getState().status).toBe('stopped');

        // ── attendant joins — both present, shared timer starts ──────────
        const t1Start = Date.now();
        await postDailyWebhook(joinPayload(attendantUser));

        call = customerStores.call.getState().call;
        expect(call!.activeUserIds.sort()).toEqual([attendantUser._id, customerUser._id].sort());
        expect(call!.overlapStartedAt).not.toBeNull();
        expect(call!.accumulatedMs).toBe(0);
        expect(attendantStores.call.getState().call).toEqual(call);
        expectTimersSynced();
        expect(customerStores.timer.getState().status).toBe('playing');

        // ── both stay in the call for a while (T1) ────────────────────────
        await wait(1100);

        // ── attendant temporarily leaves ──────────────────────────────────
        await postDailyWebhook(leavePayload(attendantUser));
        const t1End = Date.now();

        call = customerStores.call.getState().call;
        expect(call!.activeUserIds).toEqual([customerUser._id]);
        // shared timer freezes for BOTH users — not just the one who left
        expect(call!.overlapStartedAt).toBeNull();
        expect(getCallElapsedMs(call!)).toBe(call!.accumulatedMs);
        expect(attendantStores.call.getState().call).toEqual(call);

        // both stores agree the call stopped — the customer, who stayed, sees it too
        expectTimersSynced();
        expect(customerStores.timer.getState().status).toBe('stopped');
        const elapsedAtFirstLeave = customerStores.timer.getState().elapsedSeconds;

        const accumulatedAfterFirstLeave = call!.accumulatedMs;
        const observedT1 = t1End - t1Start;
        // accumulatedMs must track the real elapsed "both present" time (T1),
        // not the arbitrary propagation waits sprinkled around the webhook calls
        expect(accumulatedAfterFirstLeave).toBeGreaterThanOrEqual(observedT1 - 150);
        expect(accumulatedAfterFirstLeave).toBeLessThanOrEqual(observedT1 + 50);

        // ── gap: attendant is away — elapsed must stay frozen for BOTH stores ──
        await wait(1100);

        call = customerStores.call.getState().call;
        expect(call!.accumulatedMs).toBe(accumulatedAfterFirstLeave);
        expect(getCallElapsedMs(call!)).toBe(accumulatedAfterFirstLeave);

        expectTimersSynced();
        expect(customerStores.timer.getState().elapsedSeconds).toBe(elapsedAtFirstLeave);

        // ── attendant rejoins — both browsers must resync off the SAME clock ──
        attendantCallEvents.length = 0;
        const t3Start = Date.now();
        await postDailyWebhook(joinPayload(attendantUser));

        const attendantJoinedMsg = attendantCallEvents.find((m) => m.event === 'update_call');
        expect(attendantJoinedMsg).toBeTruthy();

        call = customerStores.call.getState().call;
        expect(call!.overlapStartedAt).not.toBeNull();
        expect(call!.overlapStartedAt).toBe(attendantJoinedMsg.data.call.overlapStartedAt);
        expect(call!.accumulatedMs).toBe(accumulatedAfterFirstLeave);
        expect(attendantStores.call.getState().call).toEqual(call);

        expectTimersSynced();
        expect(customerStores.timer.getState().status).toBe('playing');

        // ── both stay together again (T3) ─────────────────────────────────
        await wait(1100);

        // both timer stores must have advanced in lockstep — not just the raw call state
        expectTimersSynced();
        expect(customerStores.timer.getState().elapsedSeconds).toBeGreaterThan(elapsedAtFirstLeave);

        // ── attendant leaves for good ─────────────────────────────────────
        await postDailyWebhook(leavePayload(attendantUser));
        const t3End = Date.now();

        call = customerStores.call.getState().call;
        expect(call!.overlapStartedAt).toBeNull();
        expect(attendantStores.call.getState().call).toEqual(call);
        expectTimersSynced();
        expect(customerStores.timer.getState().status).toBe('stopped');

        // accumulatedMs only reflects T1 + T3 — the ~1.1s gap must be excluded
        const observedT3 = t3End - t3Start;
        const expectedFinal = accumulatedAfterFirstLeave + observedT3;
        expect(call!.accumulatedMs).toBeGreaterThanOrEqual(expectedFinal - 150);
        expect(call!.accumulatedMs).toBeLessThanOrEqual(expectedFinal + 50);
        // sanity check: a bug that keeps counting through the gap would land ~1.1s higher
        expect(call!.accumulatedMs).toBeLessThan(expectedFinal + 700);

        // ── customer leaves too — the call record is NOT torn down yet.
        //    onParticipantLeft only freezes the timer; explicit completion
        //    (the web completeCall() action, hitting IAM's /calls/complete)
        //    is the sole place that finalizes billing, flips users idle,
        //    and deletes the record.
        await postDailyWebhook(leavePayload(customerUser));

        const stillThere = await iamRequest
            .get('/calls/get-by-room')
            .query({ roomName })
            .set('Authorization', CUSTOMER_TOKEN);
        expect(stillThere.body?.isError).toBeFalsy();
        expect(stillThere.body?.accumulatedMs).toBe(call!.accumulatedMs);

        // ── the customer hangs up — /calls/complete only flips presence;
        //    Daily's own meeting.ended webhook is what actually tears the
        //    record down (via onMeetingEnded's deleteCall), asynchronously
        //    in a fire-and-forget handler — poll rather than guess a fixed
        //    delay for it.
        await customerStores.call.getState().completeCall();
        await wait(100);

        await postDailyWebhook({ type: 'meeting.ended', payload: { meeting_id: 'm-1', room: roomName, start_ts: Date.now() / 1000 } });

        const deadline = Date.now() + 10_000;
        let res: Awaited<ReturnType<typeof iamRequest.get>>;
        do {
            res = await iamRequest
                .get('/calls/get-by-room')
                .query({ roomName })
                .set('Authorization', CUSTOMER_TOKEN);
            if (res.body?.isError === true) break;
            await wait(100);
        } while (Date.now() < deadline);

        expect(res.body?.isError).toBe(true);
    });
});
