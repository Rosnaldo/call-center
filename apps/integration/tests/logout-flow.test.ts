/**
 * Integration test: user logout and grace-period behaviour
 *
 * Logout flow:
 *   ws receives { event: 'user_logout' }
 *     → handleMessageLogout: hb.stop() + startGracePeriod('offline') + ws.terminate()
 *     → graceTimer.start(userId, onStart, onExpire)
 *         onStart (immediate):  broadcastMessage(status='offline') + addToIam(offline)
 *         onExpire (after 30s): removeFromIam(userId)
 *
 * Note: ws.terminate() inside handleMessageLogout fires 'close', which calls handleClose
 * → startGracePeriod('disconnecting'). graceTimer.start() is a no-op when a timer already
 * exists for the same userId, so the status stays 'offline'.
 *
 * Reconnect within grace period:
 *   onConnection calls graceTimer.cancel(userId) → timer destroyed → status reset to 'idle'
 */

jest.mock('src/services/users');

import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { createMockUsers, ADMIN_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { MockSocketServer, createWsClient, simulateMessage } from './helpers/mock-wss';
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

describe('User Logout Flow', () => {
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

    beforeEach(async () => {
        jest.useFakeTimers();

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
        graceTimer.cancel(adminUser._id);
        graceTimer.cancel(customerUser._id);
        jest.useRealTimers();
    });

    // ── test 1 ───────────────────────────────────────────────────────────────

    it('logging out changes user status to "offline" in Redis', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);

        onConnection(wss)(adminWs);
        await flushPendingCalls();

        const loginRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        expect(loginRes.body.users[0].status).toBe('idle');

        // Simulate client sending user_logout — status transitions to offline
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        const logoutRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.users).toHaveLength(1);
        expect(logoutRes.body.users[0].id).toBe(adminUser._id);
        expect(logoutRes.body.users[0].status).toBe('offline');
    });

    // ── test 2 ───────────────────────────────────────────────────────────────

    it('user is removed from Redis after grace period expires following logout', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);

        onConnection(wss)(adminWs);
        await flushPendingCalls();

        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        const midRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);
        expect(midRes.body.users[0].status).toBe('offline');

        jest.advanceTimersByTime(30_001);
        await flushPendingCalls();

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

        // ── step 2: logout — grace timer starts, status → offline ─────────────
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        const logoutRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(logoutRes.body.users[0].status).toBe('offline');
        expect(graceTimer.has(adminUser._id)).toBe(true);

        // ── step 3: reconnect within grace period ─────────────────────────────
        const adminWs2 = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs2);
        onConnection(wss)(adminWs2);
        await flushPendingCalls();

        // Grace timer must be cancelled immediately on reconnect
        expect(graceTimer.has(adminUser._id)).toBe(false);

        // Status in Redis must be idle
        const reconnectedRes = await iamRequest
            .get('/online-users/list')
            .set('Authorization', ADMIN_TOKEN);

        expect(reconnectedRes.body.users).toHaveLength(1);
        expect(reconnectedRes.body.users[0].status).toBe('idle');

        // ── step 4: advance past original grace window — nothing fires ────────
        jest.advanceTimersByTime(30_001);
        await flushPendingCalls();

        expect(removeFromIamMock).not.toHaveBeenCalled();

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
