import { sendToUser } from '#websocket/broadcast';
import { SendIncomingCallPayload, CancelIncomingCallPayload, AcceptCallPayload } from './iam_types';

export function onSendIncomingCall(payload: SendIncomingCallPayload): void {
    console.log(`[IAM] incoming_call_sent customer=${payload.customerId} attendant=${payload.attendantId} calledBy=${payload.calledBy}`);

    const incomingCall = { customerId: payload.customerId, attendantId: payload.attendantId, calledBy: payload.calledBy };

    const callerId = payload.calledBy === 'customer' ? payload.customerId : payload.attendantId;
    const receiverId = payload.calledBy === 'customer' ? payload.attendantId : payload.customerId;

    sendToUser(callerId, {
        event: 'incoming_call_sent',
        data: { incomingCall },
    });

    sendToUser(receiverId, {
        event: 'incoming_call_received',
        data: { incomingCall },
    });
}

export function onCancelIncomingCall(payload: CancelIncomingCallPayload): void {
    console.log(`[IAM] cancel_incoming_call customer=${payload.customerId} attendant=${payload.attendantId}`);

    sendToUser(payload.customerId, {
        event: 'incoming_call_cancelled',
        data: {},
    });

    sendToUser(payload.attendantId, {
        event: 'incoming_call_cancelled',
        data: {},
    });
}

export function onCallAccepted(payload: AcceptCallPayload): void {
    console.log(`[IAM] call_accepted customer=${payload.customerId} attendant=${payload.attendantId}`);

    sendToUser(payload.customerId, {
        event: 'call_accepted',
        data: { incomingCall: payload.incomingCall },
    });

    sendToUser(payload.attendantId, {
        event: 'call_accepted',
        data: { incomingCall: payload.incomingCall },
    });
}
