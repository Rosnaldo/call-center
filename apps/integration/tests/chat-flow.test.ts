import { EventEmitter } from 'node:events';
import { IUser } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { startRealtimeServer, stopRealtimeServer } from './helpers/realtime-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { getRedisClient } from '../../iam/src/redis/singleton';
import { createWsClient } from './helpers/mock-wss';
import { createBridgedRealtimeEventSource } from './helpers/mock-realtime-sse';

import { onConnection } from '../../realtime/src/websocket/connection';
import { clientRegistry } from '../../realtime/src/websocket/client_registry';

import { createStores, Stores } from '../../web/src/states/stores';
import { AuthSession } from '../../web/src/auth/session';
import { initWs } from '../../web/src/services/ws/init-ws';
import { initRealtimeEvents } from '../../web/src/services/sse/init-realtime-events';
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
    // chat_message_received moved off the websocket onto realtime's own
    // realtime-events SSE stream — see init-realtime-events.ts and
    // apps/realtime/src/routes/realtime_events.ts. createBridgedRealtimeEventSource
    // bridges that real Redis channel into a real InitRealtimeEvents
    // instance so production dispatch logic still runs end to end. Closed
    // in afterEach.
    let sseCloses: Array<() => Promise<void>>;

    const bridgeRealtimeEvents = async (user: IUser, token: string, stores: Stores): Promise<any[]> => {
        const { factory, messages, close } = await createBridgedRealtimeEventSource(user._id);
        initRealtimeEvents.init(token, stores, factory);
        sseCloses.push(close);
        return messages;
    };

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

    afterEach(async () => {
        await Promise.all(sseCloses.map((close) => close()));
    });

    beforeEach(async () => {
        const redis = getRedisClient();
        const chatKeys = await redis.keys('chat:*');
        if (chatKeys.length) await redis.del(...chatKeys);

        clientRegistry.clear();
        jest.clearAllMocks();
        AuthSession.override({ token: CUSTOMER_TOKEN });

        sseCloses = [];
        customerStores = createStores();
        attendantStores = createStores();

        customerStores.currentUser.setState({ currentUser: customerUser });
        attendantStores.currentUser.setState({ currentUser: attendantUser });
    });

    const connectBoth = async () => {
        const { serverWs: customerWs, webFactory: customerWebFactory } = createBridgedClient(customerUser, CUSTOMER_TOKEN);
        const { serverWs: attendantWs, webFactory: attendantWebFactory } = createBridgedClient(attendantUser, ATTENDANT_TOKEN);

        clientRegistry.add(customerWs);
        clientRegistry.add(attendantWs);

        initWs.init(CUSTOMER_TOKEN, customerStores, customerWebFactory);
        initWs.init(ATTENDANT_TOKEN, attendantStores, attendantWebFactory);
        await bridgeRealtimeEvents(customerUser, CUSTOMER_TOKEN, customerStores);
        await bridgeRealtimeEvents(attendantUser, ATTENDANT_TOKEN, attendantStores);

        await onConnection()(customerWs);
        await onConnection()(attendantWs);
        await flushRealIO();

        // Set *after* connecting: the connect handshake's `user_connected`
        // push carries IAM's real (empty) call state and now correctly
        // resets the client stores to match it — seeding a fabricated call
        // before that point would just get wiped, same as it would for a
        // real client that reconnects.
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
            tokensToBeCharged: 0,
        };
        customerStores.call.setState({ call });
        attendantStores.call.setState({ call });

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
