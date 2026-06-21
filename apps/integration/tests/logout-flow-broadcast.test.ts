/**
 * Integration test: logout broadcast → web store
 *
 * Tests that when the realtime server broadcasts during a user logout,
 * the web client's initWs receives the message and updates the zustand stores.
 *
 * Broadcast flow:
 *   handleMessageLogout → startGracePeriod('offline') → graceTimer.start(onStart, onExpire)
 *     onStart (immediate):  broadcastMessage({ event: 'online_users_updated', data: { status: 'offline' } })
 *     onExpire (after 30s):  removeFromIam (no broadcast)
 *
 *   startGracePeriod is called BEFORE ws.terminate(), so the logging-out user
 *   still has readyState=OPEN and receives its own offline broadcast.
 */

jest.mock('src/services/users');

import { EventEmitter } from 'node:events';
import { IOnlineUser, IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { createMockUsers, ADMIN_TOKEN, CUSTOMER_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { MockSocketServer, createWsClient, simulateMessage } from './helpers/mock-wss';
import { onConnection } from '../../realtime/src/websocket/connection';
import { graceTimer } from '../../realtime/src/websocket/grace_timer';
import * as usersService from 'src/services/users';

import { useOnlineUsersStore } from '../../web/src/states/online-users/store';
import { initWs } from '../../web/src/services/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/transport';
import { AuthenticatedWebSocket as RealtimeWs } from '../../realtime/src/websocket/types';

const addToIamMock = usersService.addToIam as jest.Mock;
const removeFromIamMock = usersService.removeFromIam as jest.Mock;

const pendingCalls: Array<Promise<unknown>> = [];

async function flushPendingCalls(): Promise<void> {
    const snapshot = [...pendingCalls];
    pendingCalls.length = 0;
    await Promise.all(snapshot);
}

// ─── bridge helper ──────────────────────────────────────────────────────────
// Creates a paired (server, webFactory) transport so that server broadcasts
// (broadcastMessage → client.send → 'sent' event) arrive as onmessage calls
// on the web transport that initWs manages.

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

describe('User Logout Flow — Broadcast → Web Store', () => {
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

        useOnlineUsersStore.setState({ users: [] });

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

    it('other web clients receive offline status via broadcast', async () => {
        // Customer connects first (bridged: server + web initWs)
        const { serverWs: customerWs, webFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        wss.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, webFactory);
        onConnection(wss)(customerWs);
        await flushPendingCalls();

        // Admin connects — handleOpen broadcasts to customer's initWs
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        onConnection(wss)(adminWs);
        await flushPendingCalls();

        // Customer's web store should have both users as idle
        const storeBeforeLogout = useOnlineUsersStore.getState().users;
        expect(storeBeforeLogout).toHaveLength(2);

        // Admin logs out — server broadcasts online_users_updated with status 'offline'
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        const storeAfterLogout = useOnlineUsersStore.getState().users;
        const adminInStore = storeAfterLogout.find(u => u.id === adminUser._id);

        expect(adminInStore).toBeDefined();
        expect(adminInStore!.status).toBe('offline');
    });

    // ── test 2 ───────────────────────────────────────────────────────────────

    it('logging-out user receives own offline broadcast before terminate', async () => {
        // Admin connects (bridged: server + web initWs)
        const { serverWs: adminWs, webFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        initWs.init(ADMIN_TOKEN, webFactory);
        onConnection(wss)(adminWs);
        await flushPendingCalls();

        const storeBefore = useOnlineUsersStore.getState().users;
        const adminBefore = storeBefore.find(u => u.id === adminUser._id);
        expect(adminBefore?.status).toBe('idle');

        // Admin logs out — startGracePeriod fires broadcast BEFORE ws.terminate()
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        const storeAfter = useOnlineUsersStore.getState().users;
        const adminAfter = storeAfter.find(u => u.id === adminUser._id);

        expect(adminAfter).toBeDefined();
        expect(adminAfter!.status).toBe('offline');
    });

    // ── test 3 ───────────────────────────────────────────────────────────────

    it('grace period expiry does not broadcast removal to web clients', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        onConnection(wss)(adminWs);
        await flushPendingCalls();

        const { serverWs: customerWs, webFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        wss.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, webFactory);
        onConnection(wss)(customerWs);
        await flushPendingCalls();

        // Admin logs out — store transitions to offline
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        // Advance past grace period — removeFromIam fires but no broadcast
        jest.advanceTimersByTime(30_001);
        await flushPendingCalls();

        // Web store still has admin as offline (server never broadcast removal)
        const storeAfterExpiry = useOnlineUsersStore.getState().users;
        const adminInStore = storeAfterExpiry.find(u => u.id === adminUser._id);

        expect(adminInStore).toBeDefined();
        expect(adminInStore!.status).toBe('offline');
    });

    // ── test 4 ───────────────────────────────────────────────────────────────

    it('reconnect within grace period broadcasts idle status to web clients', async () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        onConnection(wss)(adminWs);
        await flushPendingCalls();

        const { serverWs: customerWs, webFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        wss.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, webFactory);
        onConnection(wss)(customerWs);
        await flushPendingCalls();

        // Admin logs out — web store shows admin offline
        simulateMessage(adminWs, { event: 'user_logout' });
        await flushPendingCalls();

        expect(
            useOnlineUsersStore.getState().users.find(u => u.id === adminUser._id)?.status,
        ).toBe('offline');

        // Admin reconnects within grace period — handleOpen broadcasts idle
        const adminWs2 = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs2);
        onConnection(wss)(adminWs2);
        await flushPendingCalls();

        const adminAfterReconnect = useOnlineUsersStore.getState().users.find(
            u => u.id === adminUser._id,
        );

        expect(adminAfterReconnect).toBeDefined();
        expect(adminAfterReconnect!.status).toBe('idle');

        adminWs2.terminate();
        await flushPendingCalls();
    });
});
