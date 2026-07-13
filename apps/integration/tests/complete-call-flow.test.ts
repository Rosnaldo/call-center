import { EventEmitter } from 'node:events';
import supertest from 'supertest';
import { IUser, mapUserToOnlineUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { addOnlineUserToRedis } from './helpers/online-users-redis';
import { getUserModel, getCallHistoryModel } from '../../iam/src/entities/models/singleton';
import { createWsClient } from './helpers/mock-wss';
import { createBridgedEventSource } from './helpers/mock-sse';
import { createBridgedRealtimeEventSource } from './helpers/mock-realtime-sse';

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

// onMeetingEnded's chain includes a real Daily.co deleteDailyRoom call
// (network-bound, variable latency) — a fixed wait after posting the
// meeting.ended webhook isn't reliable, so poll for the actual end state
// instead of guessing a duration.
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

describe('Complete Call Flow — token charge + customer/attendant store sync', () => {
    let iamRequest: IamAgent;
    let realtimeRequest: ReturnType<typeof supertest>;
    let customerUser: IUser;
    let attendantUser: IUser;
    let customerStores: Stores;
    let attendantStores: Stores;
    let roomName: string;
    // update_call carries every call-state change (participant add/remove,
    // completion, deletion) on the call-events SSE stream (published by IAM,
    // served by realtime); user_tokens_updated lives on realtime's own
    // realtime-events SSE stream — see
    // init-call-events.ts/init-realtime-events.ts. Closed in afterEach.
    let sseCloses: Array<() => Promise<void>>;

    const bridgeCallEvents = async (user: IUser, token: string, stores: Stores): Promise<any[]> => {
        const { factory, messages, close } = await createBridgedEventSource(user._id);
        initCallEvents.init(token, stores, factory);
        sseCloses.push(close);
        return messages;
    };

    const bridgeRealtimeEvents = async (user: IUser, token: string, stores: Stores): Promise<any[]> => {
        const { factory, messages, close } = await createBridgedRealtimeEventSource(user._id);
        initRealtimeEvents.init(token, stores, factory);
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
        const onlineKeys = await redis.keys('online_user:*');
        if (onlineKeys.length) await redis.del(...onlineKeys);
        await getCallHistoryModel().deleteMany({});

        clientRegistry.clear();
        jest.clearAllMocks();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        sseCloses = [];
        customerStores = createStores();
        attendantStores = createStores();

        // both users must exist as online_user Redis entries — /calls/complete
        // (fired from the web completeCall() action) looks them up to flip
        // their status idle
        await addOnlineUserToRedis(mapUserToOnlineUser(customerUser, { status: 'in-call' }));
        await addOnlineUserToRedis(mapUserToOnlineUser(attendantUser, { status: 'in-call' }));
    });

    const postDailyWebhook = async (body: Record<string, unknown>): Promise<void> => {
        await realtimeRequest.post('/webhooks/daily').send(body);
        await wait(300);
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

    // mirrors the accept-call flow, which creates the redis record before the
    // Daily room is ever joined — onMeetingStarted would self-heal via
    // createCall if this were skipped, but pre-creating it here keeps the test
    // focused on the billing/sync behavior rather than the recovery path.
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

    // reads straight from Mongo — GET /users/find-by-slug is cached and
    // charge-token doesn't invalidate that cache, so it can't be used here
    const getCustomerTokens = async (): Promise<number> => {
        const user = await getUserModel().findById(customerUser._id).lean();
        return user!.tokens ?? 0;
    };

    const getCallRecordFromRedis = async () => {
        return iamRequest.get('/calls/get-by-room').query({ roomName }).set('Authorization', CUSTOMER_TOKEN);
    };

    const getCallHistoryRecord = async () => {
        return getCallHistoryModel().findOne({ callId: `${customerUser._id}--${attendantUser._id}` }).lean();
    };

    const bridgeBothUsers = async () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);
        const customerCallEvents = await bridgeCallEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantCallEvents = await bridgeCallEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);
        const customerRealtimeEvents = await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        const attendantRealtimeEvents = await bridgeRealtimeEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);

        return { customerWs, attendantWs, customerCallEvents, attendantCallEvents, customerRealtimeEvents, attendantRealtimeEvents };
    };

    it('charges exactly one token and syncs both stores to null after a real overlap', async () => {
        const { customerWs, attendantWs, customerRealtimeEvents } = await bridgeBothUsers();

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        // userTokensUpdated only patches currentUser if currentUser.id
        // matches the charged user — needs seeding for that assertion below
        customerStores.currentUser.setState({ currentUser: mapUserToOnlineUser(customerUser) });

        await onConnection()(customerWs);
        await onConnection()(attendantWs);

        const startingTokens = await getCustomerTokens();
        expect(startingTokens).toBe(10);

        await createCallRecord();
        await postDailyWebhook({ type: 'meeting.started', payload: { meeting_id: 'm-complete-1', room: roomName, start_ts: Date.now() / 1000 } });
        await postDailyWebhook(joinPayload(customerUser));

        let call = customerStores.call.getState().call;
        expect(call).toBeTruthy();
        expect(attendantStores.call.getState().call).toEqual(call);

        await postDailyWebhook(joinPayload(attendantUser));

        call = customerStores.call.getState().call;
        expect(call!.overlapStartedAt).not.toBeNull();
        expect(attendantStores.call.getState().call).toEqual(call);

        // Billing charges 1 token once a 5-minute block is half elapsed (see
        // computeTokensToBeCharged) — waiting 2.5min in real time isn't
        // practical here, so backdate overlapStartedAt past that threshold
        // instead of actually waiting for it.
        await iamRequest.put('/calls/update').set('Authorization', CUSTOMER_TOKEN).send({
            customerId: customerUser._id,
            attendantId: attendantUser._id,
            updates: { overlapStartedAt: Date.now() - 200_000 },
        });

        // the customer hangs up directly (no explicit participant.left) —
        // IAM's /calls/complete must still compute elapsed time off overlapStartedAt
        await customerStores.call.getState().completeCall();
        await wait(300);

        // /calls/complete only flips presence + notifies (which, in production,
        // ejects both participants from the Daily room) — charging, call
        // history, and the final store clear happen off Daily's own
        // meeting.ended webhook, which is also what triggers deleteDailyRoom
        await postDailyWebhook({ type: 'meeting.ended', payload: { meeting_id: 'm-complete-1', room: roomName, start_ts: Date.now() / 1000 } });
        await waitFor(() => customerStores.call.getState().call === null);

        const endingTokens = await getCustomerTokens();
        expect(endingTokens).toBe(startingTokens - 1);

        // the charge is pushed live over realtime's own SSE stream too — not
        // just reflected in Mongo on the next fetch — and the client's own
        // currentUser balance is patched in place from it
        const tokensUpdatedMsg = customerRealtimeEvents.find((m) => m.event === 'user_tokens_updated');
        expect(tokensUpdatedMsg).toBeTruthy();
        expect(tokensUpdatedMsg.data.id).toBe(customerUser._id);
        expect(tokensUpdatedMsg.data.tokens).toBe(startingTokens - 1);
        expect(customerStores.currentUser.getState().currentUser?.tokens).toBe(startingTokens - 1);

        expect(customerStores.call.getState().call).toBeNull();
        expect(attendantStores.call.getState().call).toBeNull();
        expect(getCallViewState(customerStores)).toBe('none');
        expect(getCallViewState(attendantStores)).toBe('none');

        // the ephemeral Redis record is torn down once the call is finalized
        const res = await getCallRecordFromRedis();
        expect(res.body?.message).toBe('Call não encontrada');

        // ...but a permanent history record is written in its place
        const history = await getCallHistoryRecord();
        expect(history).not.toBeNull();
        expect(history!.accumulatedMs).toBeGreaterThan(0);
        expect(history!.tokensToBeCharged).toBe(1);
    });

    it('charges zero tokens when the attendant never joins (no overlap)', async () => {
        const { customerWs, attendantWs } = await bridgeBothUsers();

        await onConnection()(customerWs);
        await onConnection()(attendantWs);

        const startingTokens = await getCustomerTokens();

        await createCallRecord();
        await postDailyWebhook({ type: 'meeting.started', payload: { meeting_id: 'm-complete-2', room: roomName, start_ts: Date.now() / 1000 } });
        await postDailyWebhook(joinPayload(customerUser));

        const call = customerStores.call.getState().call;
        expect(call!.overlapStartedAt).toBeNull();
        expect(attendantStores.call.getState().call).toEqual(call);

        await customerStores.call.getState().completeCall();
        await wait(300);

        await postDailyWebhook({ type: 'meeting.ended', payload: { meeting_id: 'm-complete-2', room: roomName, start_ts: Date.now() / 1000 } });
        await waitFor(() => customerStores.call.getState().call === null);

        const endingTokens = await getCustomerTokens();
        expect(endingTokens).toBe(startingTokens);

        expect(customerStores.call.getState().call).toBeNull();
        expect(attendantStores.call.getState().call).toBeNull();

        const res = await getCallRecordFromRedis();
        expect(res.body?.message).toBe('Call não encontrada');

        // history is only recorded for charged calls — a zero-token call
        // (no overlap) leaves no history record
        const history = await getCallHistoryRecord();
        expect(history).toBeNull();
    });
});
