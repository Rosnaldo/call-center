jest.mock('src/services/users');

import { EventEmitter } from 'node:events';
import supertest from 'supertest';
import { IUser, IOnlineUser, getCallElapsedMs } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';
import { Properties as WebProperties } from '../../web/src/properties';

import { setBaseURL, setAuthToken } from '../src/mocks/realtime-calls-service';

import * as usersService from 'src/services/users';

const findUserBySlugMock = usersService.findUserBySlug as jest.Mock;
const addToIamMock = usersService.addToIam as jest.Mock;

const pendingCalls: Array<Promise<unknown>> = [];

async function flushPendingCalls(): Promise<void> {
    const snapshot = [...pendingCalls];
    pendingCalls.length = 0;
    await Promise.all(snapshot);
}

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

    beforeAll(async () => {
        iamRequest = await startIamServer();
        const webhookServer = await startRealtimeServer();
        realtimeRequest = supertest(webhookServer.app);

        const users = await createMockUsers();
        customerUser = users.customer;
        attendantUser = users.attendant;
        roomName = `${customerUser.slug}--${attendantUser.slug}`;

        setBaseURL(WebProperties.getInstance().backendUrl);
        setAuthToken(CUSTOMER_TOKEN);
    });

    afterAll(async () => {
        stopRealtimeServer();
        await stopIamServer();
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const callKeys = await redis.keys('calls:*');
        if (callKeys.length) await redis.del(...callKeys);

        clientRegistry.clear();
        pendingCalls.length = 0;
        jest.clearAllMocks();

        customerStores = createStores();
        attendantStores = createStores();

        addToIamMock.mockImplementation((user: IOnlineUser) => {
            const op = iamRequest.post('/online-users/add').set('Authorization', CUSTOMER_TOKEN).send(user);
            pendingCalls.push(op);
            return op;
        });

        findUserBySlugMock.mockImplementation(async (_traceId: string, slug: string) => {
            if (slug === customerUser.slug) return customerUser;
            if (slug === attendantUser.slug) return attendantUser;
            throw new Error(`unexpected slug: ${slug}`);
        });
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
        // isPlaying is the backend's explicit signal for whether the shared
        // timer should run — the web side just mirrors it (see syncFromCall).
        if (call.isPlaying) {
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

        const attendantMessages: any[] = [];
        (attendantWs as unknown as EventEmitter).on('sent', (data: string) => {
            attendantMessages.push(JSON.parse(data));
        });

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);

        onConnection()(customerWs);
        await flushPendingCalls();
        onConnection()(attendantWs);
        await flushPendingCalls();

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
            startedAt: null,
            isPlaying: false,
        });

        // ── meeting starts, customer joins alone ──────────────────────────
        await postDailyWebhook({ type: 'meeting.started', payload: { meeting_id: 'm-1', room: roomName, start_ts: Date.now() / 1000 } });
        await postDailyWebhook(joinPayload(customerUser));

        let call = customerStores.call.getState().call;
        expect(call).toBeTruthy();
        expect(call!.activeUserIds).toEqual([customerUser._id]);
        expect(call!.startedAt).toBeNull();
        expect(call!.isPlaying).toBe(false);
        expect(attendantStores.call.getState().call).toEqual(call);
        expectTimersSynced();
        expect(customerStores.timer.getState().status).toBe('stopped');

        // ── attendant joins — both present, shared timer starts ──────────
        const t1Start = Date.now();
        await postDailyWebhook(joinPayload(attendantUser));

        call = customerStores.call.getState().call;
        expect(call!.activeUserIds.sort()).toEqual([attendantUser._id, customerUser._id].sort());
        expect(call!.startedAt).not.toBeNull();
        expect(call!.isPlaying).toBe(true);
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
        expect(call!.startedAt).toBeNull();
        expect(call!.isPlaying).toBe(false);
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
        attendantMessages.length = 0;
        const t3Start = Date.now();
        await postDailyWebhook(joinPayload(attendantUser));

        const attendantJoinedMsg = attendantMessages.find((m) => m.event === 'participant_joined');
        expect(attendantJoinedMsg).toBeTruthy();

        call = customerStores.call.getState().call;
        expect(call!.startedAt).not.toBeNull();
        expect(call!.startedAt).toBe(attendantJoinedMsg.data.call.startedAt);
        expect(call!.isPlaying).toBe(true);
        expect(attendantJoinedMsg.data.call.isPlaying).toBe(true);
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
        expect(call!.startedAt).toBeNull();
        expect(call!.isPlaying).toBe(false);
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

        // ── customer leaves too — call is torn down ───────────────────────
        await postDailyWebhook(leavePayload(customerUser));

        const res = await iamRequest
            .get('/calls/get-by-room')
            .query({ roomName })
            .set('Authorization', CUSTOMER_TOKEN);
        expect(res.body?.isError).toBe(true);
    });
});
