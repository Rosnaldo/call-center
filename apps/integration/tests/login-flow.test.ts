import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, ADMIN_TOKEN, CUSTOMER_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';

// src/services/users|calls (realtime) and @/src/services/api/online-users
// (web) are all real here — apiBack resolves baseURL/auth fresh per request,
// so WebProperties.override (already set by startIamServer()) +
// AuthSession.override below are enough, no mocking needed. Awaiting
// onConnection() directly waits for its own HTTP calls to settle, but
// broadcastMessage() (fired synchronously inside onConnection, once addToIam
// + syncActiveCall resolve) triggers each connected client's refreshUsers()
// fire-and-forget — that's a *client-side* async chain with no promise
// onConnection() itself awaits, so a few real event-loop turns are needed
// for it to settle too.
async function flushRealIO(ticks = 20): Promise<void> {
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

describe('User Login Flow — Broadcast + IAM Redis Sync', () => {
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
        await getRedisClient().del('online_users');

        clientRegistry.clear();
        jest.clearAllMocks();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        customerStores = createStores();
        adminStores = createStores();
    });

    it('admin login broadcasts to web store and syncs IAM Redis', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        // ── admin connects ───────────────────────────────────────────────
        await onConnection()(adminWs);
        await flushRealIO();

        // customer's store receives admin via broadcast
        const adminInStore = customerStores.onlineUsers.getState().users
            .find(u => u.id === adminUser._id);
        expect(adminInStore).toBeDefined();
        expect(adminInStore!.status).toBe('idle');
        expect(adminInStore!.role).toBe('admin');

        // IAM Redis contains admin
        const listRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        expect(listRes.status).toBe(200);
        expect(listRes.body.users).toHaveLength(1);
        expect(listRes.body.users[0].id).toBe(adminUser._id);
        expect(listRes.body.users[0].status).toBe('idle');
    });

    it('customer login after admin broadcasts both users to web store', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        clientRegistry.add(adminWs);
        clientRegistry.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        // ── admin connects ───────────────────────────────────────────────
        await onConnection()(adminWs);
        await flushRealIO();

        // ── customer connects ────────────────────────────────────────────
        await onConnection()(customerWs);
        await flushRealIO();

        // customer's store has both users as idle
        const users = customerStores.onlineUsers.getState().users;
        expect(users).toHaveLength(2);

        const adminInStore = users.find(u => u.id === adminUser._id);
        expect(adminInStore).toBeDefined();
        expect(adminInStore!.status).toBe('idle');

        const customerInStore = users.find(u => u.id === customerUser._id);
        expect(customerInStore).toBeDefined();
        expect(customerInStore!.status).toBe('idle');

        // IAM Redis has both users
        const listRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        expect(listRes.status).toBe(200);
        expect(listRes.body.users).toHaveLength(2);

        const redisIds = listRes.body.users.map((u: IOnlineUser) => u.id);
        expect(redisIds).toContain(adminUser._id);
        expect(redisIds).toContain(customerUser._id);
        expect(listRes.body.users.every((u: IOnlineUser) => u.status === 'idle')).toBe(true);
    });
});
