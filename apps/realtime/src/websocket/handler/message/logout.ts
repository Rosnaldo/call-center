import { AuthenticatedWebSocket } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { sendToUser } from '#websocket/broadcast';
import logger from '#logger';

export const handleMessageLogout =  (
    ws: AuthenticatedWebSocket,
    hb: Heartbeat,
): void => {
    logger.info({ userId: ws.user._id, email: ws.user.email }, 'ws client logged out');
    hb.stop();

    sendToUser(ws.user._id, { event: 'user_logouted', data: { user: ws.user } });

    ws.terminate();
};
