import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { IncomingCallData } from '#websocket/types';

export const handleMessageIncomingCall = (wss: ISocketServer, data: IncomingCallData): void => {
    sendToUser(wss, data.targetUserId, {
        event: 'send_incoming_call',
        data: { incomingCall: data.incomingCall },
    });
};
