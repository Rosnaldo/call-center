import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { IncomingCallData } from '#websocket/types';

export const handleMessageIncomingCall = (wss: ISocketServer, data: IncomingCallData): void => {
    const { incomingCall } = data;

    sendToUser(wss, incomingCall.customerId, {
        event: 'incoming_call_sent',
        data: { incomingCall },
    });

    sendToUser(wss, incomingCall.attendantId, {
        event: 'incoming_call_received',
        data: { incomingCall },
    });
};
