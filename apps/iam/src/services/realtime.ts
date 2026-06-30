import { IncomingCallState } from '@repo/shared-types';
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

export async function notifyCallAccepted(traceId: string, customerId: string, attendantId: string, calledBy: string, incomingCall: IncomingCallState): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'call_accepted',
        payload: { customerId, attendantId, calledBy, incomingCall },
    });
}

export async function notifyCallCompleted(traceId: string, customerId: string, attendantId: string): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'call_completed',
        payload: { customerId, attendantId },
    });
}
