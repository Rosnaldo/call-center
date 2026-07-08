jest.mock('src/services/users');
jest.mock('src/services/calls');
jest.mock('@/src/services/api/online-users', () => ({
    fetchOnlineUsers: jest.fn(),
}));

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
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

import * as usersService from 'src/services/users';
import * as callsService from 'src/services/calls';
import * as onlineUsersService from '@/src/services/api/online-users';

const addToIamMock = usersService.addToIam as jest.Mock;
const removeFromIamMock = usersService.removeFromIam as jest.Mock;
const findUserBySlugMock = usersService.findUserBySlug as jest.Mock;
const getCallByUserMock = callsService.getCallByUser as jest.Mock;
const syncActiveCallMock = callsService.syncActiveCall as jest.Mock;
const fetchOnlineUsersMock = onlineUsersService.fetchOnlineUsers as jest.Mock;

const pendingCalls: Array<Promise<unknown>> = [];

async function flushPendingCalls(): Promise<void> {
    // drain in waves — grace_period.ts chains findUserBySlug -> addToIam ->
    // broadcastMessage across several .then() hops, and online_users_broadcast
    // triggers a client-side refetch too, so a single snapshot can miss calls
    // pushed while awaiting a prior batch. The extra microtask ticks give each
    // wave's cascading .then() chain room to enqueue further pendingCalls
    // entries before we re-check the loop condition.
    while (pendingCalls.length > 0) {
        const snapshot = [...pendingCalls];
        pendingCalls.length = 0;
        await Promise.all(snapshot);
        for (let i = 0; i < 5; i++) await Promise.resolve();
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
        jest.useFakeTimers();
        await getRedisClient().del('online_users');

        clientRegistry.clear();
        pendingCalls.length = 0;
        jest.clearAllMocks();

        customerStores = createStores();
        adminStores = createStores();

        addToIamMock.mockImplementation((user: IOnlineUser) => {
            const op = iamRequest
                .post('/online-users/add')
                .set('Authorization', CUSTOMER_TOKEN)
                .send(user);
            pendingCalls.push(op);
            return op;
        });

        removeFromIamMock.mockImplementation((userId: string) => {
            const op = iamRequest
                .delete('/online-users/remove')
                .set('Authorization', CUSTOMER_TOKEN)
                .send({ id: userId });
            pendingCalls.push(op);
            return op;
        });

        findUserBySlugMock.mockImplementation((_traceId: string, slug: string) => {
            // often the first async step of a grace-period transition chain
            // (called synchronously, before addToIam), so it must be tracked
            // in pendingCalls too or flushPendingCalls() sees an empty queue
            // and returns before addToIam ever gets pushed
            const op = (async () => {
                if (slug === adminUser.slug) return adminUser;
                if (slug === customerUser.slug) return customerUser;
                throw new Error(`unexpected slug: ${slug}`);
            })();
            pendingCalls.push(op);
            return op;
        });

        fetchOnlineUsersMock.mockImplementation(() => {
            // triggered internally off the online_users_broadcast websocket
            // handler (not called directly by the test), so track it in
            // pendingCalls too or flushPendingCalls() won't wait for it
            const op = (async () => {
                const res = await iamRequest
                    .get('/online-users/list')
                    .set('Authorization', CUSTOMER_TOKEN);
                return res.body.users ?? [];
            })();
            pendingCalls.push(op);
            return op;
        });

        // logout/grace-period expiry call endActiveCall, which checks for an
        // active call before doing anything else — none of these tests put
        // a user in a call, so this always resolves to null, but it must
        // still be tracked in pendingCalls or flushPendingCalls() races past it
        getCallByUserMock.mockImplementation(() => {
            const op = Promise.resolve(null);
            pendingCalls.push(op);
            return op;
        });

        // called once per onConnection — must resolve (not just return
        // undefined, the jest.mock() default) or onConnection's try/catch
        // swallows the error and the online_users_broadcast right after it
        // never fires
        syncActiveCallMock.mockImplementation(() => {
            const op = Promise.resolve({ call: null, shouldJoin: false });
            pendingCalls.push(op);
            return op;
        });
    });

    afterEach(() => {
        graceTimer.cancel(adminUser._id);
        graceTimer.cancel(customerUser._id);
        jest.useRealTimers();
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

        onConnection()(adminWs);
        await flushPendingCalls();

        onConnection()(customerWs);
        await flushPendingCalls();

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

        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        // handleMessageLogout only sendToUser's the logging-out client itself
        // (unlike a full broadcast) — the payload carries the full user record
        const adminLogoutMsg = adminMessages.find((m) => m.event === 'user_logouted');
        expect(adminLogoutMsg).toBeTruthy();
        expect(adminLogoutMsg.data.user._id).toBe(adminUser._id);

        // customer never receives user_logouted — it's targeted at admin only
        expect(customerMessages.find((m) => m.event === 'user_logouted')).toBeUndefined();

        // handleMessageLogout terminates the socket, which fires the same
        // 'close' handler as a raw disconnect — that's what starts the grace
        // period and fires this broadcast, not the logout handler itself
        const customerBroadcast = customerMessages.find((m) => m.event === 'online_users_broadcast');
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
            await flushPendingCalls();
        }
        jest.advanceTimersByTime(1);
        await flushPendingCalls();

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

        onConnection()(adminWs);
        await flushPendingCalls();

        onConnection()(customerWs);
        await flushPendingCalls();

        expect(customerStores.onlineUsers.getState().users).toHaveLength(2);

        // ── admin's connection drops abruptly — no user_logout message sent ──
        adminMessages.length = 0;
        customerMessages.length = 0;

        adminWs.terminate();
        await flushPendingCalls();

        // customer isn't admin's call partner (there's no call between them
        // here), so user_disconnecting/user_disconnected — now sendToUser'd
        // to the disconnecting user and their call partner only — never
        // reach customer; the presence transition below still does, via the
        // separate online_users_broadcast.
        expect(customerMessages.find((m) => m.event === 'user_disconnecting')).toBeUndefined();
        expect(customerMessages.find((m) => m.event === 'user_logouted')).toBeUndefined();
        expect(customerMessages.find((m) => m.event === 'user_disconnected')).toBeUndefined();

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
            await flushPendingCalls();
        }
        jest.advanceTimersByTime(1);
        await flushPendingCalls();

        // still nothing targeted at customer once the grace period expires,
        // for the same reason — no call, no partner to notify
        expect(customerMessages.find((m) => m.event === 'user_disconnected')).toBeUndefined();

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

        onConnection()(adminWs);
        await flushPendingCalls();

        onConnection()(customerWs);
        await flushPendingCalls();

        expect(customerStores.onlineUsers.getState().users).toHaveLength(2);

        // ── admin logs out — ws.terminate() re-enters the normal disconnect
        // flow, so admin isn't removed immediately, just grace-timered like
        // any other disconnect ────────────────────────────────────────────
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        expect(
            customerStores.onlineUsers.getState().users.find(u => u.id === adminUser._id),
        ).toBeDefined();
        expect(graceTimer.has(adminUser._id)).toBe(true);

        // ── admin logs back in ────────────────────────────────────────────
        const { serverWs: adminWs2, webFactory: adminWebFactory2 } = createBridgedClient(adminUser, ADMIN_TOKEN);
        clientRegistry.add(adminWs2);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory2);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        onConnection()(adminWs2);
        await flushPendingCalls();

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
