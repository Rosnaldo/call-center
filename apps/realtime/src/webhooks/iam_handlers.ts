import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { SendIncomingCallPayload } from './iam_types';

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
