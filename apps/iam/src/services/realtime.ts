import { IncomingCallState, IUser, Message } from '@repo/shared-types';
import { createRealtimeClient } from '#apis/realtime';

export async function notifyIncomingCallSent(traceId: string, customerId: string, attendantId: string, calledBy: string): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'incoming_call_sent',
        payload: { customerId, attendantId, calledBy },
    });
}

export async function notifyIncomingCallCancelled(traceId: string, customerId: string, attendantId: string): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'incoming_call_cancelled',
        payload: { customerId, attendantId },
    });
}

export async function notifyCallAccepted(traceId: string, customerId: string, attendantId: string, calledBy: string, roomName: string, incomingCall: IncomingCallState): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'call_accepted',
        payload: { customerId, attendantId, calledBy, roomName, incomingCall },
    });
}

export async function notifyCallCompleted(traceId: string, customerId: string, attendantId: string, roomName: string): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'call_completed',
        payload: { customerId, attendantId, roomName },
    });
}

export async function notifyUserTokenCharged(traceId: string, user: IUser): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'user_token_charged',
        payload: { user },
    });
}

export async function notifyChatMessageSent(traceId: string, customerId: string, attendantId: string, message: Message): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'chat_message_sent',
        payload: { customerId, attendantId, message },
    });
}
