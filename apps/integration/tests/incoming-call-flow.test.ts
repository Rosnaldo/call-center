/**
 * Integration test: incoming call flow
 *
 * IAM      → real Express app backed by MongoMemoryServer + ioredis-mock
 * Realtime → onConnection handler driven by EventEmitterTransport (no real WebSocket server)
 * Web      → WebClientStore simulation that processes broadcast frames
 *
 * Scenario
 * 1. Customer and attendant connect via WebSocket
 * 2. Customer emits an incoming_call message targeting the attendant
 * 3. Customer sets incomingCall locally (mirrors web app sendIncomingCall)
 * 4. Attendant receives incoming_call via WS
 * 5. Both stores contain correct incomingCall data
 */

jest.mock('src/services/users');

import { IOnlineUser, IncomingCallState } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { MockSocketServer, createWsClient, collectSentMessages, simulateMessage } from './helpers/mock-wss';
import { WebClientStore } from './helpers/web-store';

import { onConnection } from '../../realtime/src/websocket/connection';

import * as usersService from 'src/services/users';

const addToIamMock = usersService.addToIam as jest.Mock;
const pendingIamCalls: Array<Promise<unknown>> = [];

function flushIamCalls(): Promise<void[]> {
    const snapshot = [...pendingIamCalls];
    pendingIamCalls.length = 0;
    return Promise.all(snapshot) as Promise<void[]>;
}

describe('Incoming Call Flow', () => {
    let iamRequest: IamAgent;
    let customerUser: Awaited<ReturnType<typeof createMockUsers>>['customer'];
    let attendantUser: Awaited<ReturnType<typeof createMockUsers>>['attendant'];

    let wss: MockSocketServer;
    const customerStore = new WebClientStore();
    const attendantStore = new WebClientStore();

    beforeAll(async () => {
        iamRequest = await startIamServer();
        const users = await createMockUsers();
        customerUser = users.customer;
        attendantUser = users.attendant;
    });

    afterAll(async () => {
        await stopIamServer();
    });

    beforeEach(() => {
        wss = new MockSocketServer();
        customerStore.clear();
        attendantStore.clear();
        pendingIamCalls.length = 0;
        jest.clearAllMocks();

        addToIamMock.mockImplementation((user: IOnlineUser, token: string) => {
            const op = iamRequest
                .post('/online-users/add')
                .set('Authorization', token)
                .send(user);
            pendingIamCalls.push(op);
            return op;
        });
    });

    it('customer and attendant stores both have incomingCall data after customer initiates call', async () => {
        const customerWs = createWsClient(customerUser, CUSTOMER_TOKEN);
        const customerMessages = collectSentMessages(customerWs);
        wss.add(customerWs);
        onConnection(wss)(customerWs);
        await flushIamCalls();

        const attendantWs = createWsClient(attendantUser, ATTENDANT_TOKEN);
        const attendantMessages = collectSentMessages(attendantWs);
        wss.add(attendantWs);
        onConnection(wss)(attendantWs);
        await flushIamCalls();

        customerMessages.length = 0;
        attendantMessages.length = 0;

        const incomingCall: IncomingCallState = {
            customerId: customerUser._id,
            attendantId: attendantUser._id,
        };

        // Customer sends incoming_call via WS (targets attendant)
        simulateMessage(customerWs, {
            event: 'incoming_call',
            data: {
                targetUserId: attendantUser._id,
                incomingCall,
            },
        });

        // Customer sets incomingCall locally (mirrors web app sendIncomingCall)
        customerStore.setIncomingCall(incomingCall);

        // Attendant receives incoming_call via WS
        attendantMessages.forEach((m) => attendantStore.processMessage(m));

        // Both stores have incomingCall data
        const customerIncoming = customerStore.getIncomingCall();
        expect(customerIncoming).not.toBeNull();
        expect(customerIncoming!.customerId).toBe(customerUser._id);
        expect(customerIncoming!.attendantId).toBe(attendantUser._id);

        const attendantIncoming = attendantStore.getIncomingCall();
        expect(attendantIncoming).not.toBeNull();
        expect(attendantIncoming!.customerId).toBe(customerUser._id);
        expect(attendantIncoming!.attendantId).toBe(attendantUser._id);
    });
});
