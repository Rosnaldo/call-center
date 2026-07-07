jest.mock('src/services/users');
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
import * as onlineUsersService from '@/src/services/api/online-users';

const addToIamMock = usersService.addToIam as jest.Mock;
const removeFromIamMock = usersService.removeFromIam as jest.Mock;
const findUserBySlugMock = usersService.findUserBySlug as jest.Mock;
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
    });

    afterEach(() => {
        graceTimer.cancel(adminUser._id);
        graceTimer.cancel(customerUser._id);
        jest.useRealTimers();
    });

    it('other web clients receive offline status via broadcast', async () => {
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

        // ── both receive user_logouted broadcast immediately on logout ───
        const adminLogoutMsg = adminMessages.find((m) => m.event === 'user_logouted');
        const customerLogoutMsg = customerMessages.find((m) => m.event === 'user_logouted');
        expect(adminLogoutMsg).toBeTruthy();
        expect(customerLogoutMsg).toBeTruthy();
        expect(customerLogoutMsg.data).toEqual({ id: adminUser._id });

        // ── other clients receive online_users_broadcast after logout ───
        // (admin's own socket is already terminated by handleMessageLogout
        // by the time this fires, since it's now preceded by a fresh
        // findUserBySlug lookup — so admin itself won't see it, only others)
        console.log('DEBUG customerMessages', JSON.stringify(customerMessages));
        const customerBroadcast = customerMessages.find((m) => m.event === 'online_users_broadcast');
        expect(customerBroadcast).toBeTruthy();

        // customer's web store shows admin as offline (broadcast)
        const adminInCustomerStore = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminInCustomerStore).toBeDefined();
        expect(adminInCustomerStore!.status).toBe('offline');

        // IAM Redis shows admin as offline (sync)
        const logoutRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        const adminInRedis = logoutRes.body.users
            .find((u: IOnlineUser) => u.id === adminUser._id);
        expect(adminInRedis).toBeDefined();
        expect(adminInRedis!.status).toBe('offline');
    });

    it('raw disconnect (no explicit logout) broadcasts user_disconnected', async () => {
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

        // ── customer receives user_disconnected, not user_logouted ──────────
        const customerDisconnectMsg = customerMessages.find((m) => m.event === 'user_disconnected');
        expect(customerDisconnectMsg).toBeTruthy();
        expect(customerDisconnectMsg.data).toEqual({ id: adminUser._id });
        expect(customerMessages.find((m) => m.event === 'user_logouted')).toBeUndefined();

        // customer's web store shows admin as disconnecting (broadcast)
        const adminInCustomerStore = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminInCustomerStore).toBeDefined();
        expect(adminInCustomerStore!.status).toBe('disconnecting');
    });

    it('grace period expiry removes user and broadcasts removal', async () => {
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

        onConnection()(adminWs);
        await flushPendingCalls();

        onConnection()(customerWs);
        await flushPendingCalls();

        expect(customerStores.onlineUsers.getState().users).toHaveLength(2);

        // ── admin logs out — status transitions to offline ───────────────
        customerMessages.length = 0;
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        // customer receives the user_logouted broadcast immediately on logout
        const customerLogoutMsg = customerMessages.find((m) => m.event === 'user_logouted');
        expect(customerLogoutMsg).toBeTruthy();
        expect(customerLogoutMsg.data).toEqual({ id: adminUser._id });

        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('offline');

        // ── advance past grace period (2min), keeping customer's own Redis
        // presence entry alive via periodic heartbeats along the way (a real
        // client would do this too) — otherwise its 90s TTL lazily expires
        // once fake time jumps past it, and the final refetch below would
        // wrongly show customer as gone too
        for (let i = 0; i < 4; i++) {
            jest.advanceTimersByTime(30_000);
            simulateMessage(customerWs, { event: 'heartbeat' });
            await flushPendingCalls();
        }
        jest.advanceTimersByTime(1);
        await flushPendingCalls();

        // customer receives the online_users_broadcast signal on grace period expiry
        const customerRemovalMsg = customerMessages.find((m) => m.event === 'online_users_broadcast');
        expect(customerRemovalMsg).toBeTruthy();

        // customer's store no longer contains admin (broadcast removal)
        const adminAfterExpiry = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminAfterExpiry).toBeUndefined();

        // only customer remains in the store
        expect(customerStores.onlineUsers.getState().users).toHaveLength(1);
        expect(customerStores.onlineUsers.getState().users[0].id).toBe(customerUser._id);

        // IAM Redis no longer contains admin (sync)
        const finalRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', CUSTOMER_TOKEN);
        const adminInRedis = finalRes.body.users
            .find((u: IOnlineUser) => u.id === adminUser._id);
        expect(adminInRedis).toBeUndefined();
    });

    it('reconnect within grace period broadcasts idle status to users', async () => {
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

        // ── admin logs out — status transitions to offline ───────────────
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('offline');
        expect(graceTimer.has(adminUser._id)).toBe(true);

        // ── admin reconnects within grace period ─────────────────────────
        const { serverWs: adminWs2, webFactory: adminWebFactory2 } = createBridgedClient(adminUser, ADMIN_TOKEN);
        clientRegistry.add(adminWs2);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory2);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        onConnection()(adminWs2);
        await flushPendingCalls();

        // grace timer cancelled on reconnect
        expect(graceTimer.has(adminUser._id)).toBe(false);

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
        await flushPendingCalls();

        expect(removeFromIamMock).not.toHaveBeenCalled();

        // admin still idle in customer's store
        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('idle');
    });
});
