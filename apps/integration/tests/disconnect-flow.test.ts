/**
 * Integration test: user disconnection and grace-period expiry
 *
 * Disconnect flow:
 *   ws.terminate()
 *     → readyState = CLOSED, then 'close' event fires
 *     → handleClose: hb.stop() + startGracePeriod()
 *     → graceTimer.start(userId, onStart, onExpire)
 *         onStart (immediate):  broadcastMessage(status='disconnecting') + addToIam(disconnecting)
 *         onExpire (after 30s): removeFromIam(userId)
 *
 * Note: the disconnecting user has readyState=CLOSED when broadcastMessage runs,
 * so it does NOT receive its own disconnect event — only other connected clients do.
 *
 * jest.useFakeTimers() lets us advance past the 30-second grace period instantly.
 * addToIam / removeFromIam are mocked to hit the real IAM supertest server.
 */

jest.mock('src/services/users');

import { IOnlineUser, IUser } from '@repo/shared-types';
import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { createMockUsers, ADMIN_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { MockSocketServer, createWsClient } from './helpers/mock-wss';
import { onConnection } from '../../realtime/src/websocket/connection';
import { graceTimer } from '../../realtime/src/websocket/grace_timer';
import * as usersService from 'src/services/users';

const addToIamMock = usersService.addToIam as jest.Mock;
const removeFromIamMock = usersService.removeFromIam as jest.Mock;

const pendingCalls: Array<Promise<unknown>> = [];

async function flushPendingCalls(): Promise<void> {
    const snapshot = [...pendingCalls];
    pendingCalls.length = 0;
    await Promise.all(snapshot);
}

// ─── suite ───────────────────────────────────────────────────────────────────

describe('User Disconnect Flow', () => {
    let iamRequest: IamAgent;
    let adminUser: IUser;
    let wss: MockSocketServer;

    beforeAll(async () => {
        iamRequest = await startIamServer();
        const users = await createMockUsers();
        adminUser = users.admin;
    });

    afterAll(async () => {
        await stopIamServer();
    });

    beforeEach(async () => {
        jest.useFakeTimers();

        // Wipe Redis online_users between tests so state doesn't bleed across them.
        await getRedisClient().del('online_users');

        wss = new MockSocketServer();
        pendingCalls.length = 0;
        jest.clearAllMocks();

        addToIamMock.mockImplementation((user: IOnlineUser, token: string) => {
            const op = iamRequest
                .post('/online-users/add')
                .set('Authorization', token)
                .send(user);
            pendingCalls.push(op);
            return op;
        });

        removeFromIamMock.mockImplementation((userId: string, token: string) => {
            const op = iamRequest
                .delete('/online-users/remove')
                .set('Authorization', token)
                .send({ id: userId });
            pendingCalls.push(op);
            return op;
        });
    });

    afterEach(() => {
        // Cancel any open grace timers to keep the module-level graceTimer Map clean.
        graceTimer.cancel(adminUser._id);
        jest.useRealTimers();
    });

    // ── test 1 ───────────────────────────────────────────────────────────────

    it('disconnecting user status changes to "disconnecting" in Redis', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);

        // Login
        onConnection(wss)(adminWs);
        await flushPendingCalls();

        const loginRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        expect(loginRes.body.users[0].status).toBe('idle');

        // Disconnect — terminate() sets readyState=CLOSED before emitting 'close',
        // so the user itself won't receive the subsequent broadcast.
        adminWs.terminate();
        await flushPendingCalls(); // wait for addToIam(disconnecting)

        const disconnectRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(disconnectRes.status).toBe(200);
        expect(disconnectRes.body.users).toHaveLength(1);
        expect(disconnectRes.body.users[0].id).toBe(adminUser._id);
        expect(disconnectRes.body.users[0].status).toBe('disconnecting');
    });

    // ── test 2 ───────────────────────────────────────────────────────────────

    it('user is removed from Redis after grace period expires', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);

        // Login → idle in Redis
        onConnection(wss)(adminWs);
        await flushPendingCalls();

        // Disconnect → onStart fires immediately (status = disconnecting in Redis)
        adminWs.terminate();
        await flushPendingCalls();

        // Sanity check
        const midRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        expect(midRes.body.users[0].status).toBe('disconnecting');

        // Advance past the 30-second grace period — fires onExpire → removeFromIam
        jest.advanceTimersByTime(30_001);
        await flushPendingCalls(); // wait for removeFromIam HTTP call

        // User must be gone from Redis
        const finalRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(finalRes.status).toBe(200);
        expect(finalRes.body.users).toHaveLength(0);
    });

    // ── test 3 ───────────────────────────────────────────────────────────────

    it('reconnecting within grace period resets status to "idle" and cancels removal', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);

        // ── step 1: login ─────────────────────────────────────────────────────
        onConnection(wss)(adminWs);
        await flushPendingCalls();

        // ── step 2: disconnect — grace timer starts, status → disconnecting ──
        adminWs.terminate();
        await flushPendingCalls();

        const disconnectingRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(disconnectingRes.body.users[0].status).toBe('disconnecting');
        expect(graceTimer.has(adminUser._id)).toBe(true); // timer is running

        // ── step 3: reconnect within grace period ─────────────────────────────
        // onConnection cancels the pending timer and re-broadcasts as idle.
        const adminWs2 = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs2);
        onConnection(wss)(adminWs2);
        await flushPendingCalls();

        // Grace timer must be gone immediately after reconnect
        expect(graceTimer.has(adminUser._id)).toBe(false);

        // Status in Redis must be idle again
        const reconnectedRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(reconnectedRes.body.users).toHaveLength(1);
        expect(reconnectedRes.body.users[0].status).toBe('idle');

        // ── step 4: advance past original grace window — nothing fires ────────
        jest.advanceTimersByTime(30_001);
        await flushPendingCalls();

        expect(removeFromIamMock).not.toHaveBeenCalled();

        // User is still in Redis
        const finalRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(finalRes.body.users).toHaveLength(1);
        expect(finalRes.body.users[0].status).toBe('idle');

        // Cleanup
        adminWs2.terminate();
        await flushPendingCalls();
    });
});
