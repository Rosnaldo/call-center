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
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

import * as dailyServiceModule from '../../iam/src/services/daily';

// Exercises IAM's SyncActiveCall (apps/iam/src/controllers/call/sync_active_call.ts),
// which realtime's onConnection calls on every websocket connect (see
// apps/realtime/src/websocket/connection.ts). It reconciles a stale-looking
// call record against who's *actually* present in the Daily room:
//   - nobody else there  -> the record (and the Daily room) is torn down,
//     the connecting user does not rejoin a meeting
//   - someone else is there -> the record is kept, the connecting user is
//     added as a participant and told to (re)join the meeting
//
// getRoomPresenceUserIds hits the real Daily.co API (no mock — see the other
// *-call-flow test files), which is exactly right for the "alone" case: no
// real WebRTC participant ever joins these Node-only tests, so presence is
// naturally empty. The "someone else is there" case can't be produced for
// real the same way (that would need an actual WebRTC client), so it's the
// one place in this file that stubs presence via jest.spyOn directly on the
// real module — not a parallel mock file — restored in afterEach.
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
            isPlaying: false,
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

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        // no jest.spyOn here — real Daily.co presence for this room is
        // empty, since no real WebRTC participant ever joined it
        await onConnection()(customerWs);

        const connectedMsg = customerMessages.find((m) => m.event === 'user_connected');
        expect(connectedMsg).toBeTruthy();
        expect(connectedMsg.data.call).toBeNull();
        expect(connectedMsg.data.shouldJoin).toBe(false);

        // the stale record (and the Daily room behind it) is torn down
        const res = await getCallRecordFromRedis();
        expect(res.body?.message).toBe('Call não encontrada');

        // client never joins a meeting — no call/viewState to sync into
        expect(customerStores.call.getState().call).toBeNull();
        expect(customerStores.callView.getState().viewState).toBe('none');
        expect(dailyCoService.joinCalls).toHaveLength(0);
    });

    it('keeps the call and rejoins the meeting when another participant is present', async () => {
        await createCallRecord();

        jest.spyOn(dailyServiceModule, 'getRoomPresenceUserIds').mockImplementation(async (room: string) =>
            room === roomName ? [attendantUser._id] : [],
        );

        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        clientRegistry.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        await onConnection()(customerWs);

        const connectedMsg = customerMessages.find((m) => m.event === 'user_connected');
        expect(connectedMsg).toBeTruthy();
        expect(connectedMsg.data.shouldJoin).toBe(true);
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
        await waitFor(() => customerStores.callView.getState().viewState === 'in-call');
        expect(customerStores.call.getState().call).toBeTruthy();
        expect(customerStores.call.getState().call?.activeUserIds).toContain(customerUser._id);
        expect(dailyCoService.joinCalls).toHaveLength(1);
        expect(dailyCoService.joinCalls[0]).toMatchObject({ room: roomName, userId: customerUser._id });
    });

    it('self-heals a new call with the connecting user in it when no record exists but presence shows them in a tracked room', async () => {
        // no createCallRecord() here — this is the "redis lost the call
        // state entirely" case selfHealFromPresence exists for (e.g. a
        // redis restart), reconstructed off Daily's own tracked rooms +
        // presence instead of an existing calls:* entry.
        await iamRequest.post('/calls/track-room').set('Authorization', CUSTOMER_TOKEN).send({ roomName });

        jest.spyOn(dailyServiceModule, 'getRoomPresenceUserIds').mockImplementation(async (room: string) =>
            room === roomName ? [customerUser._id] : [],
        );

        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        clientRegistry.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        await onConnection()(customerWs);

        const connectedMsg = customerMessages.find((m) => m.event === 'user_connected');
        expect(connectedMsg).toBeTruthy();
        expect(connectedMsg.data.shouldJoin).toBe(true);
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
        await waitFor(() => customerStores.callView.getState().viewState === 'in-call');
        expect(customerStores.call.getState().call).toBeTruthy();
        expect(customerStores.call.getState().call?.activeUserIds).toContain(customerUser._id);
        expect(dailyCoService.joinCalls).toHaveLength(1);
        expect(dailyCoService.joinCalls[0]).toMatchObject({ room: roomName, userId: customerUser._id });
    });
});
