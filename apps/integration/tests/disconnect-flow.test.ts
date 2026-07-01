jest.mock('src/services/users');

import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, ADMIN_TOKEN, CUSTOMER_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { onConnection } from '../../realtime/src/websocket/connection';
import { graceTimer } from '../../realtime/src/websocket/grace_timer';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

import * as usersService from 'src/services/users';

const addToIamMock = usersService.addToIam as jest.Mock;
const removeFromIamMock = usersService.removeFromIam as jest.Mock;

const pendingCalls: Array<Promise<unknown>> = [];

async function flushPendingCalls(): Promise<void> {
    const snapshot = [...pendingCalls];
    pendingCalls.length = 0;
    await Promise.all(snapshot);
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
    });

    afterEach(() => {
        graceTimer.cancel(adminUser._id);
        graceTimer.cancel(customerUser._id);
        jest.useRealTimers();
    });

    it('other web clients receive disconnecting status via broadcast', async () => {
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

        // ── admin disconnects — terminate() sets readyState=CLOSED before
        //    the broadcast, so admin itself won't receive it ──────────────
        adminWs.terminate();
        await flushPendingCalls();

        // customer's store shows admin as disconnecting (broadcast)
        const adminInStore = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminInStore).toBeDefined();
        expect(adminInStore!.status).toBe('disconnecting');

        // IAM Redis shows admin as disconnecting (sync)
        const res = await iamRequest
            .get('/online-users/list')
            .set('Authorization', CUSTOMER_TOKEN);
        const adminInRedis = res.body.users
            .find((u: IOnlineUser) => u.id === adminUser._id);
        expect(adminInRedis).toBeDefined();
        expect(adminInRedis!.status).toBe('disconnecting');
    });

    it('grace period expiry removes user and broadcasts removal', async () => {
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

        // ── admin disconnects ────────────────────────────────────────────
        adminWs.terminate();
        await flushPendingCalls();

        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('disconnecting');

        // ── advance past grace period (2min) ──────────────────────────────
        jest.advanceTimersByTime(120_001);
        await flushPendingCalls();

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

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        onConnection()(adminWs);
        await flushPendingCalls();

        onConnection()(customerWs);
        await flushPendingCalls();

        // ── admin disconnects — status transitions to disconnecting ──────
        adminWs.terminate();
        await flushPendingCalls();

        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('disconnecting');
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

        expect(
            customerStores.onlineUsers.getState().users
                .find(u => u.id === adminUser._id)?.status,
        ).toBe('idle');
    });
});
