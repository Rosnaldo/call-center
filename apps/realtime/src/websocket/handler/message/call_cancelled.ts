import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { CancelledCallData } from '#websocket/types';

export const handleMessageCallCancelled = (wss: ISocketServer, data: CancelledCallData): void => {
    sendToUser(wss, data.targetUserId, {
        event: 'call_cancelled',
        data: {},
    });
};
