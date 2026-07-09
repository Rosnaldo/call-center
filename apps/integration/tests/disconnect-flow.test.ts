import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, ADMIN_TOKEN, CUSTOMER_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { simulateMessage, createWsClient } from './helpers/mock-wss';
import { onConnection } from '../../realtime/src/websocket/connection';
import { graceTimer } from '../../realtime/src/websocket/grace_timer';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

// src/services/users|calls (realtime) and @/src/services/api/online-users
// (web) are all real here — apiBack resolves baseURL/auth fresh per request,
// so WebProperties.override (already set by startIamServer()) +
// AuthSession.override below are enough, no mocking needed. But grace_period's
// disconnect chain (getCallByUser -> updateOnlineUserStatus -> broadcast) is
// kicked off fire-and-forget from a synchronous 'close' EventEmitter
// listener, so the test has no promise to await directly. jest.useFakeTimers()
// is also active in this suite (to fast-forward the 2min grace window) — real
// setTimeout-based waits would never fire under it, and by default jest's
// fake timers also replace process.nextTick, so looping on that hangs
// forever (it queues into jest's fake, never-drained queue instead of the
// real one — confirmed by hand). setImmediate, explicitly excluded from
// faking below, does yield to the real event loop's poll phase, so looping
// on that reliably lets an in-process, localhost-fast HTTP round trip settle.
async function flushRealIO(ticks = 50): Promise<void> {
    for (let i = 0; i < ticks; i++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
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

describe('User Disconnect Flow — Broadcast + IAM Redis Sync', () => {
    let iamRequest: IamAgent;
    let adminUser: IUser;
    let customerUser: IUser;
    let customerStores: Stores;
    let adminStores: Stores;

    beforeAll(async () => {
        iamRequest = await startIamServer();
        await startRealtimeServer();
        const users = await createMockUsers();
        adminUser = users.admin;
        customerUser = users.customer;
    });

    afterAll(async () => {
        stopRealtimeServer();
        await stopIamServer();
    });

    beforeEach(async () => {
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
        await getRedisClient().del('online_users');

        clientRegistry.clear();
        jest.clearAllMocks();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        customerStores = createStores();
        adminStores = createStores();
    });

    afterEach(() => {
        graceTimer.cancel(adminUser._id);
        graceTimer.cancel(customerUser._id);
        jest.useRealTimers();
    });

    it('other web clients still see idle status via broadcast when there is no active call', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        await onConnection()(adminWs);
        await onConnection()(customerWs);
        await flushRealIO();

        expect(customerStores.onlineUsers.getState().users).toHaveLength(2);

        // ── admin disconnects — terminate() sets readyState=CLOSED before
        //    the broadcast, so admin itself won't receive it ──────────────
        adminWs.terminate();
        await flushRealIO();

        // grace_period only flips status to 'disconnecting' when the user
        // has an active call — admin isn't in one here, so status stays
        // 'idle', but the broadcast still fires and customer's store still
        // reflects admin's (unchanged) presence entry
        const adminInStore = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminInStore).toBeDefined();
        expect(adminInStore!.status).toBe('idle');

        // IAM Redis still shows admin as idle (no active call)
        const res = await iamRequest
            .get('/online-users/list')
            .set('Authorization', CUSTOMER_TOKEN);
        const adminInRedis = res.body.users
            .find((u: IOnlineUser) => u.id === adminUser._id);
        expect(adminInRedis).toBeDefined();
        expect(adminInRedis!.status).toBe('idle');
    });

    it('grace period expiry removes user and broadcasts removal', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        await onConnection()(adminWs);
        await onConnection()(customerWs);
        await flushRealIO();

        // ── admin disconnects — no active call, so status stays idle ─────
        adminWs.terminate();
        await flushRealIO();

        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('idle');

        // ── advance past grace period (2min), keeping customer's own Redis
        // presence entry alive via periodic heartbeats along the way (a real
        // client would do this too) — otherwise its 90s TTL lazily expires
        // once fake time jumps past it, and the final refetch below would
        // wrongly show customer as gone too
        for (let i = 0; i < 4; i++) {
            jest.advanceTimersByTime(30_000);
            simulateMessage(customerWs, { event: 'heartbeat' });
            await flushRealIO();
        }
        jest.advanceTimersByTime(1);
        await flushRealIO();

        // customer's store no longer contains admin (broadcast removal)
        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id),
        ).toBeUndefined();

        expect(customerStores.onlineUsers.getState().users).toHaveLength(1);
        expect(customerStores.onlineUsers.getState().users[0].id).toBe(customerUser._id);

        // IAM Redis no longer contains admin (sync)
        const finalRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', CUSTOMER_TOKEN);
        expect(finalRes.body.users.find((u: IOnlineUser) => u.id === adminUser._id))
            .toBeUndefined();
    });

    it('reconnect within grace period broadcasts idle status to users', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        const customerMessages: any[] = [];
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        await onConnection()(adminWs);
        await onConnection()(customerWs);
        await flushRealIO();

        // ── admin disconnects — grace timer starts, but status stays idle
        //    since there's no active call to flip it to disconnecting ────
        adminWs.terminate();
        await flushRealIO();

        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('idle');
        expect(graceTimer.has(adminUser._id)).toBe(true);

        // ── admin reconnects within grace period ─────────────────────────
        customerMessages.length = 0;
        const { serverWs: adminWs2, webFactory: adminWebFactory2 } = createBridgedClient(adminUser, ADMIN_TOKEN);
        clientRegistry.add(adminWs2);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory2);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        await onConnection()(adminWs2);
        await flushRealIO();

        // grace timer cancelled on reconnect
        expect(graceTimer.has(adminUser._id)).toBe(false);

        // admin and customer aren't in a call together here, so reconnecting
        // targets no one — partner_reconnected is sendToUser'd only to an
        // actual call partner, never broadcast
        expect(customerMessages.find((m) => m.event === 'partner_reconnected')).toBeUndefined();

        // customer's store shows admin back as idle (broadcast)
        const adminAfterReconnect = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminAfterReconnect).toBeDefined();
        expect(adminAfterReconnect!.status).toBe('idle');

        // IAM Redis shows admin as idle (sync)
        const reconnectRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        const adminInRedis = reconnectRes.body.users
            .find((u: IOnlineUser) => u.id === adminUser._id);
        expect(adminInRedis).toBeDefined();
        expect(adminInRedis!.status).toBe('idle');

        // ── advance past original grace window — nothing fires ───────────
        jest.advanceTimersByTime(120_001);
        await flushRealIO();

        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('idle');
    });
});
