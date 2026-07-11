import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, ADMIN_TOKEN, CUSTOMER_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { simulateMessage, createWsClient } from './helpers/mock-wss';
import { createBridgedRealtimeEventSource } from './helpers/mock-realtime-sse';
import { onConnection } from '../../realtime/src/websocket/connection';
import { graceTimer } from '../../realtime/src/websocket/grace_timer';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { initRealtimeEvents } from '../../web/src/services/sse/init-realtime-events';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

// src/services/users|calls (realtime) and @/src/services/api/online-users
// (web) are all real here — apiBack resolves baseURL/auth fresh per request,
// so WebProperties.override (already set by startIamServer()) +
// AuthSession.override below are enough, no mocking needed. The grace-period /
// logout disconnect chain is kicked off fire-and-forget from a synchronous
// 'close' EventEmitter listener though, so there's no promise for the test
// to await directly, and jest.useFakeTimers() is active (to fast-forward the
// 2min grace window) — real setTimeout-based waits never fire under it, and
// by default jest's fake timers also replace process.nextTick, so looping on
// that hangs forever (it queues into jest's fake, never-drained queue
// instead of the real one — confirmed by hand). setImmediate, explicitly
// excluded from faking below, does yield to the real event loop's poll
// phase, so looping on that reliably lets an in-process, localhost-fast HTTP
// round trip settle.
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

describe('User Logout Flow — Broadcast + IAM Redis Sync', () => {
    let iamRequest: IamAgent;
    let adminUser: IUser;
    let customerUser: IUser;
    let customerStores: Stores;
    let adminStores: Stores;
    // user_logouted/user_disconnecting/user_disconnected/online_users_broadcast
    // moved off the websocket onto realtime's own SSE stream — see
    // init-realtime-events.ts and apps/realtime/src/routes/realtime_events.ts.
    // createBridgedRealtimeEventSource bridges that same real Redis channel
    // into a real InitRealtimeEvents instance, so production dispatch logic
    // still runs end to end. Closed in afterEach.
    let sseCloses: Array<() => Promise<void>>;

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

        sseCloses = [];
        customerStores = createStores();
        adminStores = createStores();
    });

    afterEach(async () => {
        graceTimer.cancel(adminUser._id);
        graceTimer.cancel(customerUser._id);
        jest.useRealTimers();
        await Promise.all(sseCloses.map((close) => close()));
    });

    it('logout notifies the user directly and falls back to the normal disconnect grace period', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        const adminMessages: any[] = [];
        const customerMessages: any[] = [];
        (adminWs as unknown as EventEmitter).on('sent', (data: string) => {
            adminMessages.push(JSON.parse(data));
        });
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        // admin inits first; customer inits last so this.stores = customerStores
        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        const adminRealtimeEvents = await bridgeRealtimeEvents(adminUser, ADMIN_TOKEN, adminStores);
        const customerRealtimeEvents = await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);

        await onConnection()(adminWs);
        await onConnection()(customerWs);
        await flushRealIO();

        // both users appear in customer's store as idle
        expect(customerStores.onlineUsers.getState().users).toHaveLength(2);

        // both users are idle in IAM Redis
        const loginRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        expect(loginRes.body.users).toHaveLength(2);
        expect(loginRes.body.users.every((u: IOnlineUser) => u.status === 'idle')).toBe(true);

        // ── admin logs out ───────────────────────────────────────────────
        adminMessages.length = 0;
        customerMessages.length = 0;
        adminRealtimeEvents.length = 0;
        customerRealtimeEvents.length = 0;

        simulateMessage(adminWs, { event: 'user_logout' });
        await flushRealIO();

        // handleMessageLogout only notifies the logging-out client itself
        // (unlike a full broadcast) — the payload carries the full user record
        const adminLogoutMsg = adminRealtimeEvents.find((m) => m.event === 'user_logouted');
        expect(adminLogoutMsg).toBeTruthy();
        expect(adminLogoutMsg.data.user._id).toBe(adminUser._id);

        // customer never receives user_logouted — it's targeted at admin only
        expect(customerRealtimeEvents.find((m) => m.event === 'user_logouted')).toBeUndefined();

        // handleMessageLogout terminates the socket, which fires the same
        // 'close' handler as a raw disconnect — that's what starts the grace
        // period and fires this broadcast, not the logout handler itself
        const customerBroadcast = customerRealtimeEvents.find((m) => m.event === 'online_users_broadcast');
        expect(customerBroadcast).toBeTruthy();

        // logout no longer skips the grace period — ws.terminate() re-enters
        // the normal disconnect flow, same as any other closed connection
        expect(graceTimer.has(adminUser._id)).toBe(true);

        // no active call, so grace_period doesn't touch status — admin still
        // shows up as idle immediately after logout
        const adminInCustomerStore = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminInCustomerStore).toBeDefined();
        expect(adminInCustomerStore!.status).toBe('idle');

        // ── advance past the grace period (2min), keeping customer's own
        // Redis presence entry alive via heartbeats ───────────────────────
        for (let i = 0; i < 4; i++) {
            jest.advanceTimersByTime(30_000);
            simulateMessage(customerWs, { event: 'heartbeat' });
            await flushRealIO();
        }
        jest.advanceTimersByTime(1);
        await flushRealIO();

        // once the grace period expires, admin is finally removed
        expect(
            customerStores.onlineUsers.getState().users.find(u => u.id === adminUser._id),
        ).toBeUndefined();

        const logoutRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        const adminInRedis = logoutRes.body.users
            .find((u: IOnlineUser) => u.id === adminUser._id);
        expect(adminInRedis).toBeUndefined();
    });

    it('raw disconnect (no explicit logout) broadcasts online_users_broadcast, without targeting an unrelated user', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        const adminMessages: any[] = [];
        const customerMessages: any[] = [];
        (adminWs as unknown as EventEmitter).on('sent', (data: string) => {
            adminMessages.push(JSON.parse(data));
        });
        (customerWs as unknown as EventEmitter).on('sent', (data: string) => {
            customerMessages.push(JSON.parse(data));
        });

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        const customerRealtimeEvents = await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);

        await onConnection()(adminWs);
        await onConnection()(customerWs);
        await flushRealIO();

        expect(customerStores.onlineUsers.getState().users).toHaveLength(2);

        // ── admin's connection drops abruptly — no user_logout message sent ──
        adminMessages.length = 0;
        customerMessages.length = 0;
        customerRealtimeEvents.length = 0;

        adminWs.terminate();
        await flushRealIO();

        // customer isn't admin's call partner (there's no call between them
        // here), so user_disconnecting/user_disconnected — now published
        // to the disconnecting user and their call partner only — never
        // reach customer; the presence transition below still does, via the
        // separate online_users_broadcast.
        expect(customerRealtimeEvents.find((m) => m.event === 'user_disconnecting')).toBeUndefined();
        expect(customerRealtimeEvents.find((m) => m.event === 'user_logouted')).toBeUndefined();
        expect(customerRealtimeEvents.find((m) => m.event === 'user_disconnected')).toBeUndefined();

        // customer's web store still shows admin as idle — grace_period only
        // flips status to 'disconnecting' when there's an active call, and
        // admin isn't in one here — but the broadcast itself still fires
        const adminInCustomerStore = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminInCustomerStore).toBeDefined();
        expect(adminInCustomerStore!.status).toBe('idle');

        // ── advance past the grace period (2min) without admin reconnecting,
        // keeping customer's own Redis presence entry alive via heartbeats ──
        for (let i = 0; i < 4; i++) {
            jest.advanceTimersByTime(30_000);
            simulateMessage(customerWs, { event: 'heartbeat' });
            await flushRealIO();
        }
        jest.advanceTimersByTime(1);
        await flushRealIO();

        // still nothing targeted at customer once the grace period expires,
        // for the same reason — no call, no partner to notify
        expect(customerRealtimeEvents.find((m) => m.event === 'user_disconnected')).toBeUndefined();

        expect(
            customerStores.onlineUsers.getState().users.find(u => u.id === adminUser._id),
        ).toBeUndefined();
    });

    it('logging back in after logout works like a fresh connect', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);

        await onConnection()(adminWs);
        await onConnection()(customerWs);
        await flushRealIO();

        expect(customerStores.onlineUsers.getState().users).toHaveLength(2);

        // ── admin logs out — ws.terminate() re-enters the normal disconnect
        // flow, so admin isn't removed immediately, just grace-timered like
        // any other disconnect ────────────────────────────────────────────
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushRealIO();

        expect(
            customerStores.onlineUsers.getState().users.find(u => u.id === adminUser._id),
        ).toBeDefined();
        expect(graceTimer.has(adminUser._id)).toBe(true);

        // ── admin logs back in ────────────────────────────────────────────
        const { serverWs: adminWs2, webFactory: adminWebFactory2 } = createBridgedClient(adminUser, ADMIN_TOKEN);
        clientRegistry.add(adminWs2);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory2);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        await onConnection()(adminWs2);
        await flushRealIO();

        // customer's store shows admin back as idle (broadcast)
        const adminAfterRelogin = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminAfterRelogin).toBeDefined();
        expect(adminAfterRelogin!.status).toBe('idle');

        // IAM Redis shows admin as idle (sync)
        const reloginRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        const adminInRedis = reloginRes.body.users
            .find((u: IOnlineUser) => u.id === adminUser._id);
        expect(adminInRedis).toBeDefined();
        expect(adminInRedis!.status).toBe('idle');
    });
});
