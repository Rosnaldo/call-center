import { IncomingCallState } from '@repo/shared-types';
import { realtimeApi } from '#apis/realtime';

export async function notifyIncomingCallSent(customerId: string, attendantId: string, calledBy: string): Promise<void> {
    await realtimeApi.post('/webhooks/iam', {
        event: 'incoming_call_sent',
        payload: { customerId, attendantId, calledBy },
    });
}

export async function notifyIncomingCallCancelled(customerId: string, attendantId: string): Promise<void> {
    await realtimeApi.post('/webhooks/iam', {
        event: 'incoming_call_cancelled',
        payload: { customerId, attendantId },
    });
}

export async function notifyCallAccepted(customerId: string, attendantId: string, calledBy: string, incomingCall: IncomingCallState): Promise<void> {
    await realtimeApi.post('/webhooks/iam', {
        event: 'call_accepted',
        payload: { customerId, attendantId, calledBy, incomingCall },
    });
}
