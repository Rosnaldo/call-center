import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { IncomingCallData } from '#websocket/types';

export const handleMessageIncomingCall = (wss: ISocketServer, data: IncomingCallData): void => {
    sendToUser(wss, data.targetUserId, {
        event: 'incoming_call',
        data: { call: data.call },
    });
};
