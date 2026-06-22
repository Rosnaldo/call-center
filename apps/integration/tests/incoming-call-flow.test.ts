/**
 * Integration test: incoming call flow
 *
 * IAM      → real Express app backed by MongoMemoryServer + ioredis-mock
 * Realtime → onConnection handler driven by EventEmitterTransport (no real WebSocket server)
 *
 * Scenario
 * 1. Customer and attendant connect via WebSocket
 * 2. Customer emits an incoming_call message targeting the attendant
 * 3. Server forwards the incoming_call to the target attendant
 */

jest.mock('src/services/users');

import { EventEmitter } from 'node:events';
import { IOnlineUser, IncomingCallState } from '@repo/shared-types';

import { startIamServer, stopIamServer, IamAgent } from './helpers/iam-server';
import { createMockUsers, CUSTOMER_TOKEN, ATTENDANT_TOKEN } from './helpers/users';
import { MockSocketServer, createWsClient, simulateMessage } from './helpers/mock-wss';

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

    it('incoming_call message is forwarded to the target attendant', async () => {
        const customerWs = createWsClient(customerUser, CUSTOMER_TOKEN);
        wss.add(customerWs);
        onConnection(wss)(customerWs);
        await flushIamCalls();

        const attendantWs = createWsClient(attendantUser, ATTENDANT_TOKEN);
        wss.add(attendantWs);
        onConnection(wss)(attendantWs);
        await flushIamCalls();

        const incomingCall: IncomingCallState = {
            customerId: customerUser._id,
            attendantId: attendantUser._id,
            calledBy: 'customer',
        };

        const received: string[] = [];
        (attendantWs as unknown as EventEmitter).on('sent', (data: string) => received.push(data));

        // Customer sends incoming_call via WS (targets attendant)
        simulateMessage(customerWs, {
            event: 'incoming_call',
            data: {
                targetUserId: attendantUser._id,
                incomingCall,
            },
        });

        const parsed = received.map((m) => JSON.parse(m));
        const incomingCallMsg = parsed.find((m) => m.event === 'incoming_call');
        expect(incomingCallMsg).toBeTruthy();
        expect(incomingCallMsg.data.incomingCall.customerId).toBe(customerUser._id);
        expect(incomingCallMsg.data.incomingCall.attendantId).toBe(attendantUser._id);
    });
});
