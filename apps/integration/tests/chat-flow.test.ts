import { EventEmitter } from 'node:events';
import { IUser, mapUserToOnlineUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { ITransport, TransportFactory } from '../../web/src/services/ws/transport';


async function flushRealIO(ticks = 30): Promise<void> {
    for (let i = 0; i < ticks; i++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
}

async function waitFor(condition: () => boolean, maxTicks = 300): Promise<void> {
    for (let i = 0; i < maxTicks; i++) {
        if (condition()) return;
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

describe('Chat Flow — during an active call', () => {
    let iamRequest: IamAgent;
    let customerUser: IUser;
    let attendantUser: IUser;
    let customerStores: Stores;
    let attendantStores: Stores;
    let roomName: string;

    beforeAll(async () => {
        iamRequest = await startIamServer();
        await startRealtimeServer();

        const users = await createMockUsers();
        customerUser = users.customer;
        attendantUser = users.attendant;
        roomName = `${customerUser.slug}--${attendantUser.slug}`;
    });

    afterAll(async () => {
        stopRealtimeServer();
        await stopIamServer();
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const chatKeys = await redis.keys('chat:*');
        if (chatKeys.length) await redis.del(...chatKeys);

        clientRegistry.clear();
        jest.clearAllMocks();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        customerStores = createStores();
        attendantStores = createStores();

        customerStores.currentUser.setState({ currentUser: mapUserToOnlineUser(customerUser) });
        attendantStores.currentUser.setState({ currentUser: mapUserToOnlineUser(attendantUser) });

        const call = {
            id: `${customerUser._id}--${attendantUser._id}`,
            customerId: customerUser._id,
            customerName: `${customerUser.firstName} ${customerUser.lastName}`,
            attendantId: attendantUser._id,
            attendantName: `${attendantUser.firstName} ${attendantUser.lastName}`,
            roomName,
            activeUserIds: [customerUser._id, attendantUser._id],
            accumulatedMs: 0,
            overlapStartedAt: null,
            startedAt: null,
            endedAt: null,
            isPlaying: false,
            tokensToBeCharged: 0,
        };
        customerStores.call.setState({ call });
        attendantStores.call.setState({ call });
    });

    const connectBoth = async () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        await flushRealIO();

        return { customerWs, attendantWs };
    };

    it('a message the customer sends is delivered to both sides and persisted', async () => {
        await connectBoth();

        await customerStores.chat.getState().sendChatMessage('Olá, tudo bem?');
        await waitFor(() =>
            customerStores.chat.getState().messages.length > 0
            && attendantStores.chat.getState().messages.length > 0,
        );

        // both sides auto-processed chat_message_received into their own store
        expect(customerStores.chat.getState().messages).toHaveLength(1);
        expect(customerStores.chat.getState().messages[0]).toMatchObject({ sender: 'customer', text: 'Olá, tudo bem?' });
        expect(attendantStores.chat.getState().messages).toHaveLength(1);
        expect(attendantStores.chat.getState().messages[0]).toMatchObject({ sender: 'customer', text: 'Olá, tudo bem?' });

        // and it's durably stored in IAM's redis-backed history, not just pushed live
        const res = await iamRequest.get('/chat/get-messages')
            .query({ customerId: customerUser._id, attendantId: attendantUser._id })
            .set('Authorization', CUSTOMER_TOKEN);
        expect(res.body.messages).toHaveLength(1);
        expect(res.body.messages[0]).toMatchObject({ sender: 'customer', text: 'Olá, tudo bem?' });
    });

    it('a reply the attendant sends is delivered back to the customer', async () => {
        await connectBoth();

        await attendantStores.chat.getState().sendChatMessage('Oi! Como posso ajudar?');
        await waitFor(() =>
            customerStores.chat.getState().messages.length > 0
            && attendantStores.chat.getState().messages.length > 0,
        );

        expect(customerStores.chat.getState().messages).toHaveLength(1);
        expect(customerStores.chat.getState().messages[0]).toMatchObject({ sender: 'attendant', text: 'Oi! Como posso ajudar?' });
        expect(attendantStores.chat.getState().messages).toHaveLength(1);
        expect(attendantStores.chat.getState().messages[0]).toMatchObject({ sender: 'attendant', text: 'Oi! Como posso ajudar?' });
    });

    it('unread flag is set for the recipient only when their chat box is closed', async () => {
        await connectBoth();

        // customer has the chat box open (actively watching); attendant does not
        customerStores.chat.getState().openChat();

        await attendantStores.chat.getState().sendChatMessage('Mensagem enquanto o chat está fechado');
        await waitFor(() =>
            customerStores.chat.getState().messages.length > 0
            && attendantStores.chat.getState().messages.length > 0,
        );

        expect(customerStores.chat.getState().hasUnreadMessage).toBe(false);
        expect(attendantStores.chat.getState().hasUnreadMessage).toBe(true);
    });
});
