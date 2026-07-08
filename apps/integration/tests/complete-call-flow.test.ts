jest.mock('src/services/users');
jest.mock('@/src/services/api/calls');

import { EventEmitter } from 'node:events';
import supertest from 'supertest';
import { IUser, mapUserToOnlineUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { getUserModel, getCallHistoryModel } from '../../iam/src/entities/models/singleton';
import { createWsClient } from './helpers/mock-wss';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';
import { Properties as WebProperties } from '../../web/src/properties';

import { setBaseURL, setAuthToken } from '../src/mocks/realtime-calls-service';

import * as usersService from 'src/services/users';
import * as callsApiService from '@/src/services/api/calls';

const findUserBySlugMock = usersService.findUserBySlug as jest.Mock;
const addToIamMock = usersService.addToIam as jest.Mock;
const mockCompleteCall = callsApiService.completeCall as jest.Mock;

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

describe('Complete Call Flow — token charge + customer/attendant store sync', () => {
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
        const onlineKeys = await redis.keys('online_user:*');
        if (onlineKeys.length) await redis.del(...onlineKeys);
        await getCallHistoryModel().deleteMany({});

        clientRegistry.clear();
        pendingCalls.length = 0;
        jest.clearAllMocks();

        customerStores = createStores();
        attendantStores = createStores();

        addToIamMock.mockImplementation((user) => {
            const op = iamRequest.post('/online-users/add').set('Authorization', CUSTOMER_TOKEN).send(user);
            pendingCalls.push(op);
            return op;
        });

        findUserBySlugMock.mockImplementation(async (_traceId: string, slug: string) => {
            if (slug === customerUser.slug) return customerUser;
            if (slug === attendantUser.slug) return attendantUser;
            throw new Error(`unexpected slug: ${slug}`);
        });

        mockCompleteCall.mockImplementation(async (customerId: string, attendantId: string) => {
            await iamRequest.post('/calls/complete').set('Authorization', CUSTOMER_TOKEN)
                .send({ customerId, attendantId });
        });

        // both users must exist as online_user Redis entries — /calls/complete
        // (fired from the web completeCall() action) looks them up to flip
        // their status idle
        await iamRequest.post('/online-users/add').set('Authorization', CUSTOMER_TOKEN)
            .send(mapUserToOnlineUser(customerUser, { status: 'in-call' }));
        await iamRequest.post('/online-users/add').set('Authorization', CUSTOMER_TOKEN)
            .send(mapUserToOnlineUser(attendantUser, { status: 'in-call' }));
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
            isPlaying: false,
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

    const bridgeBothUsers = () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);

        return { customerWs, attendantWs };
    };

    it('charges exactly one token and syncs both stores to null after a real overlap', async () => {
        const { customerWs, attendantWs } = bridgeBothUsers();

        await onConnection()(customerWs);
        await flushPendingCalls();
        await onConnection()(attendantWs);
        await flushPendingCalls();

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
        expect(call!.isPlaying).toBe(true);
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

        const endingTokens = await getCustomerTokens();
        expect(endingTokens).toBe(startingTokens - 1);

        expect(customerStores.call.getState().call).toBeNull();
        expect(attendantStores.call.getState().call).toBeNull();
        expect(customerStores.callView.getState().viewState).toBe('none');
        expect(attendantStores.callView.getState().viewState).toBe('none');

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
        const { customerWs, attendantWs } = bridgeBothUsers();

        await onConnection()(customerWs);
        await flushPendingCalls();
        await onConnection()(attendantWs);
        await flushPendingCalls();

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
