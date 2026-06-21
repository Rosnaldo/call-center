import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { SendIncomingCallPayload, CancelIncomingCallPayload } from './iam_types';

export function onSendIncomingCall(wss: ISocketServer, payload: SendIncomingCallPayload): void {
    console.log(`[IAM] send_incoming_call customer=${payload.customerId} attendant=${payload.attendantId}`);

    const incomingCall = { customerId: payload.customerId, attendantId: payload.attendantId };

    sendToUser(wss, payload.customerId, {
        event: 'send_incoming_call',
        data: { incomingCall },
    });

    sendToUser(wss, payload.attendantId, {
        event: 'send_incoming_call',
        data: { incomingCall },
    });
}

export function onCancelIncomingCall(wss: ISocketServer, payload: CancelIncomingCallPayload): void {
    console.log(`[IAM] cancel_incoming_call customer=${payload.customerId} attendant=${payload.attendantId}`);

    sendToUser(wss, payload.customerId, {
        event: 'cancel_incoming_call',
        data: {},
    });

    sendToUser(wss, payload.attendantId, {
        event: 'cancel_incoming_call',
        data: {},
    });
}
