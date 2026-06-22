import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { SendIncomingCallPayload, CancelIncomingCallPayload, AnswerCallPayload } from './iam_types';

export function onSendIncomingCall(wss: ISocketServer, payload: SendIncomingCallPayload): void {
    console.log(`[IAM] incoming_call_sent customer=${payload.customerId} attendant=${payload.attendantId} whoIsCalling=${payload.whoIsCalling}`);

    const incomingCall = { customerId: payload.customerId, attendantId: payload.attendantId, whoIsCalling: payload.whoIsCalling };

    const callerId = payload.whoIsCalling === 'customer' ? payload.customerId : payload.attendantId;
    const receiverId = payload.whoIsCalling === 'customer' ? payload.attendantId : payload.customerId;

    sendToUser(wss, callerId, {
        event: 'incoming_call_sent',
        data: { incomingCall },
    });

    sendToUser(wss, receiverId, {
        event: 'incoming_call_received',
        data: { incomingCall },
    });
}

export function onCancelIncomingCall(wss: ISocketServer, payload: CancelIncomingCallPayload): void {
    console.log(`[IAM] cancel_incoming_call customer=${payload.customerId} attendant=${payload.attendantId}`);

    sendToUser(wss, payload.customerId, {
        event: 'incoming_call_cancelled',
        data: {},
    });

    sendToUser(wss, payload.attendantId, {
        event: 'incoming_call_cancelled',
        data: {},
    });
}

export function onAnswerCall(wss: ISocketServer, payload: AnswerCallPayload): void {
    console.log(`[IAM] answer_call customer=${payload.customerId} attendant=${payload.attendantId}`);

    sendToUser(wss, payload.customerId, {
        event: 'call_answered',
        data: { customerId: payload.customerId, attendantId: payload.attendantId },
    });

    sendToUser(wss, payload.attendantId, {
        event: 'call_answered',
        data: { customerId: payload.customerId, attendantId: payload.attendantId },
    });
}
