import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { CancelledCallData } from '#websocket/types';

export const handleMessageCallCancelled = (wss: ISocketServer, data: CancelledCallData): void => {
    sendToUser(wss, data.targetUserId, {
        event: 'cancel_incoming_call',
        data: {},
    });
};
