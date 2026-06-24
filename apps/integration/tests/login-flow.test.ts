jest.mock('src/services/users');

import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, ADMIN_TOKEN, CUSTOMER_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { MockSocketServer, createWsClient } from './helpers/mock-wss';
import { onConnection } from '../../realtime/src/websocket/connection';

import { createStores, Stores } from '../../web/src/states/stores';
import { initWs } from '../../web/src/services/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/transport';

import * as usersService from 'src/services/users';

const addToIamMock = usersService.addToIam as jest.Mock;

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

describe('User Login Flow — Broadcast + IAM Redis Sync', () => {
    let iamRequest: IamAgent;
    let adminUser: IUser;
    let customerUser: IUser;
    let wss: MockSocketServer;
    let customerStores: Stores;
    let adminStores: Stores;

    beforeAll(async () => {
        iamRequest = await startIamServer();
        wss = new MockSocketServer();
        await startRealtimeServer(wss);
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

        wss.clear();
        pendingCalls.length = 0;
        jest.clearAllMocks();

        customerStores = createStores();
        adminStores = createStores();

        addToIamMock.mockImplementation((user: IOnlineUser, token: string) => {
            const op = iamRequest
                .post('/online-users/add')
                .set('Authorization', token)
                .send(user);
            pendingCalls.push(op);
            return op;
        });
    });

    it('admin login broadcasts to web store and syncs IAM Redis', async () => {
        const { serverWs: adminWs, webFactory: adminWebFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);

        wss.add(adminWs);
        wss.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        // ── admin connects ───────────────────────────────────────────────
        onConnection(wss)(adminWs);
        await flushPendingCalls();

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

        wss.add(adminWs);
        wss.add(customerWs);

        initWs.init(ADMIN_TOKEN, adminStores, adminWebFactory);
        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);

        // ── admin connects ───────────────────────────────────────────────
        onConnection(wss)(adminWs);
        await flushPendingCalls();

        // ── customer connects ────────────────────────────────────────────
        onConnection(wss)(customerWs);
        await flushPendingCalls();

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
