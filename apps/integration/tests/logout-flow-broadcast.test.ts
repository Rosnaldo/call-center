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
import { IUser } from '@repo/shared-types';

import { MockSocketServer, createWsClient, simulateMessage } from './helpers/mock-wss';
import { onConnection } from '../../realtime/src/websocket/connection';
import { graceTimer } from '../../realtime/src/websocket/grace_timer';

import { useOnlineUsersStore } from '../../web/src/states/stores';
import { initWs } from '../../web/src/services/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/transport';

const ADMIN_TOKEN = 'mock-admin-token';
const CUSTOMER_TOKEN = 'mock-customer-token';

const adminUser: IUser = {
    _id: 'admin-broadcast-id',
    slug: 'admin-integration',
    firstName: 'Admin',
    lastName: 'Integration',
    email: 'admin@integration.test',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
};

const customerUser: IUser = {
    _id: 'customer-broadcast-id',
    slug: 'customer-integration',
    firstName: 'Customer',
    lastName: 'Integration',
    email: 'customer@integration.test',
    role: 'customer',
    createdAt: new Date(),
    updatedAt: new Date(),
};

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
    let wss: MockSocketServer;

    beforeEach(() => {
        jest.useFakeTimers();
        wss = new MockSocketServer();
        jest.clearAllMocks();
        useOnlineUsersStore.setState({ users: [] });
    });

    afterEach(() => {
        graceTimer.cancel(adminUser._id);
        graceTimer.cancel(customerUser._id);
        jest.useRealTimers();
    });

    // ── test 1 ───────────────────────────────────────────────────────────────

    it('other web clients receive offline status via broadcast', () => {
        // Customer connects first (bridged: server + web initWs)
        const { serverWs: customerWs, webFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        wss.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, webFactory);
        onConnection(wss)(customerWs);

        // Admin connects — handleOpen broadcasts to customer's initWs
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        onConnection(wss)(adminWs);

        // Customer's web store should have both users as idle
        expect(useOnlineUsersStore.getState().users).toHaveLength(2);

        // Admin logs out — server broadcasts online_users_updated with status 'offline'
        simulateMessage(adminWs, { event: 'user_logout' });

        const adminInStore = useOnlineUsersStore.getState().users.find(u => u.id === adminUser._id);
        expect(adminInStore).toBeDefined();
        expect(adminInStore!.status).toBe('offline');
    });

    // ── test 2 ───────────────────────────────────────────────────────────────

    it('logging-out user receives own offline broadcast before terminate', () => {
        // Admin connects (bridged: server + web initWs)
        const { serverWs: adminWs, webFactory } = createBridgedClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        initWs.init(ADMIN_TOKEN, webFactory);
        onConnection(wss)(adminWs);

        expect(
            useOnlineUsersStore.getState().users.find(u => u.id === adminUser._id)?.status,
        ).toBe('idle');

        // Admin logs out — startGracePeriod fires broadcast BEFORE ws.terminate()
        simulateMessage(adminWs, { event: 'user_logout' });

        const adminAfter = useOnlineUsersStore.getState().users.find(u => u.id === adminUser._id);
        expect(adminAfter).toBeDefined();
        expect(adminAfter!.status).toBe('offline');
    });

    // ── test 3 ───────────────────────────────────────────────────────────────

    it('grace period expiry does not broadcast removal to web clients', () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        onConnection(wss)(adminWs);

        const { serverWs: customerWs, webFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        wss.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, webFactory);
        onConnection(wss)(customerWs);

        // Admin logs out — store transitions to offline
        simulateMessage(adminWs, { event: 'user_logout' });

        // Advance past grace period — removeFromIam fires but no broadcast
        jest.advanceTimersByTime(30_001);

        // Web store still has admin as offline (server never broadcast removal)
        const adminInStore = useOnlineUsersStore.getState().users.find(u => u.id === adminUser._id);
        expect(adminInStore).toBeDefined();
        expect(adminInStore!.status).toBe('offline');
    });

    // ── test 4 ───────────────────────────────────────────────────────────────

    it('reconnect within grace period broadcasts idle status to web clients', () => {
        const adminWs = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs);
        onConnection(wss)(adminWs);

        const { serverWs: customerWs, webFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        wss.add(customerWs);
        initWs.init(CUSTOMER_TOKEN, webFactory);
        onConnection(wss)(customerWs);

        // Admin logs out — web store shows admin offline
        simulateMessage(adminWs, { event: 'user_logout' });

        expect(
            useOnlineUsersStore.getState().users.find(u => u.id === adminUser._id)?.status,
        ).toBe('offline');

        // Admin reconnects within grace period — handleOpen broadcasts idle
        const adminWs2 = createWsClient(adminUser, ADMIN_TOKEN);
        wss.add(adminWs2);
        onConnection(wss)(adminWs2);

        const adminAfterReconnect = useOnlineUsersStore.getState().users.find(
            u => u.id === adminUser._id,
        );
        expect(adminAfterReconnect).toBeDefined();
        expect(adminAfterReconnect!.status).toBe('idle');

        adminWs2.terminate();
    });
});
