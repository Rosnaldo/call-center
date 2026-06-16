/**
 * Integration test: sequential user login flow
 *
 * IAM    → real Express app backed by MongoMemoryServer + ioredis-mock
 * Realtime → onConnection handler driven by EventEmitterTransport (no real WebSocket server)
 * Web    → WebClientStore simulation that processes broadcast frames
 *
 * Scenario
 * 1. Admin logs in  → onConnection fires → IAM /online-users/add → Redis updated
 *                  → admin's own web-store receives the broadcast frame
 * 2. Customer logs in → same flow
 *                  → both admin AND customer web-stores receive the customer frame
 *                  → IAM Redis contains both users
 */

// Must be called before any import that transitively pulls in src/services/users
jest.mock('src/services/users');

import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { createMockUsers, ADMIN_TOKEN, CUSTOMER_TOKEN } from './helpers/users';
import { MockSocketServer, createWsClient, collectSentMessages } from './helpers/mock-wss';
import { WebClientStore } from './helpers/web-store';

// Realtime connection handler — imported after jest.mock so the mock is in place
import { onConnection } from '../../realtime/src/websocket/connection';

// Type the auto-mocked module
import * as usersService from 'src/services/users';

// ─── helpers ────────────────────────────────────────────────────────────────

const addToIamMock = usersService.addToIam as jest.Mock;
const pendingIamCalls: Array<Promise<unknown>> = [];

function flushIamCalls(): Promise<void[]> {
    const snapshot = [...pendingIamCalls];
    pendingIamCalls.length = 0;
    return Promise.all(snapshot) as Promise<void[]>;
}

// ─── suite ──────────────────────────────────────────────────────────────────

describe('User Login Flow', () => {
    let iamRequest: IamAgent;
    let adminUser: IUser;
    let customerUser: IUser;

    let wss: MockSocketServer;
    const adminStore = new WebClientStore();
    const customerStore = new WebClientStore();

    beforeAll(async () => {
        iamRequest = await startIamServer();
        const users = await createMockUsers();
        adminUser = users.admin;
        customerUser = users.customer;
    });

    afterAll(async () => {
        await stopIamServer();
    });

    beforeEach(() => {
        wss = new MockSocketServer();
        adminStore.clear();
        customerStore.clear();
        pendingIamCalls.length = 0;
        jest.clearAllMocks();

        // Wire addToIam to call the real IAM server and track the promise
        addToIamMock.mockImplementation((user: IOnlineUser, token: string) => {
            const op = iamRequest
                .post('/online-users/add')
                .set('Authorization', token)
                .send(user);
            pendingIamCalls.push(op);
            return op;
        });
    });

    // ── test 1 ───────────────────────────────────────────────────────────────

    it('admin login adds admin to IAM Redis and to admin web-store', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        const adminMessages = collectSentMessages(adminWs);

        wss.add(adminWs);
        onConnection(wss)(adminWs);

        // Wait for the fire-and-forget addToIam HTTP call to complete
        await flushIamCalls();

        // IAM Redis should contain admin
        const listRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(listRes.status).toBe(200);
        const redisUsers: IOnlineUser[] = listRes.body.users;
        expect(redisUsers).toHaveLength(1);
        expect(redisUsers[0].id).toBe(adminUser._id);
        expect(redisUsers[0].role).toBe('admin');

        // Admin web-store received the broadcast for admin's own connection
        adminMessages.forEach((m) => adminStore.processMessage(m));
        expect(adminStore.getUserById(adminUser._id)).toBeTruthy();
        expect(adminStore.getUserById(adminUser._id)?.role).toBe('admin');
    });

    // ── test 2 ───────────────────────────────────────────────────────────────

    it('customer login after admin → both appear in Redis and in the correct web-stores', async () => {
        // ── re-connect admin (wss is fresh per beforeEach) ───────────────────
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        const adminMessages = collectSentMessages(adminWs);
        wss.add(adminWs);
        onConnection(wss)(adminWs);
        await flushIamCalls();

        adminMessages.forEach((m) => adminStore.processMessage(m));
        adminMessages.length = 0; // reset so we can inspect the customer broadcast separately

        // ── customer connects ─────────────────────────────────────────────────
        const customerWs = createWsClient(customerUser, CUSTOMER_TOKEN);
        const customerMessages = collectSentMessages(customerWs);
        wss.add(customerWs);
        onConnection(wss)(customerWs);
        await flushIamCalls();

        // ── assert Redis has both users ───────────────────────────────────────
        const listRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(listRes.status).toBe(200);
        const redisUsers: IOnlineUser[] = listRes.body.users;
        expect(redisUsers).toHaveLength(2);

        const redisIds = redisUsers.map((u) => u.id);
        expect(redisIds).toContain(adminUser._id);
        expect(redisIds).toContain(customerUser._id);

        // ── admin web-store received customer's broadcast ─────────────────────
        // (admin was already connected when customer joined → broadcastMessage
        //  sends to all wss.clients including admin)
        adminMessages.forEach((m) => adminStore.processMessage(m));
        expect(adminStore.getUserById(adminUser._id)).toBeTruthy();
        expect(adminStore.getUserById(customerUser._id)).toBeTruthy();
        expect(adminStore.getOnlineUsers()).toHaveLength(2);

        // ── customer web-store only received customer's own join event ─────────
        // (customer was not connected when admin joined)
        customerMessages.forEach((m) => customerStore.processMessage(m));
        expect(customerStore.getUserById(customerUser._id)).toBeTruthy();
        expect(customerStore.getUserById(adminUser._id)).toBeUndefined();
        expect(customerStore.getOnlineUsers()).toHaveLength(1);
    });
});
