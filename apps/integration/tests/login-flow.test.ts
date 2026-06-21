/**
 * Integration test: sequential user login flow
 *
 * IAM      → real Express app backed by MongoMemoryServer + ioredis-mock
 * Realtime → onConnection handler driven by EventEmitterTransport (no real WebSocket server)
 *
 * Scenario
 * 1. Admin logs in  → onConnection fires → IAM /online-users/add → Redis updated
 * 2. Customer logs in → same flow → IAM Redis contains both users
 */

// Must be called before any import that transitively pulls in src/services/users
jest.mock('src/services/users');

import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { createMockUsers, ADMIN_TOKEN, CUSTOMER_TOKEN } from './helpers/users';
import { MockSocketServer, createWsClient } from './helpers/mock-wss';

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

    it('admin login adds admin to IAM Redis', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);

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
    });

    // ── test 2 ───────────────────────────────────────────────────────────────

    it('customer login after admin → both appear in Redis', async () => {
        // ── re-connect admin (wss is fresh per beforeEach) ───────────────────
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        onConnection(wss)(adminWs);
        await flushIamCalls();

        // ── customer connects ─────────────────────────────────────────────────
        const customerWs = createWsClient(customerUser, CUSTOMER_TOKEN);
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
    });
});
