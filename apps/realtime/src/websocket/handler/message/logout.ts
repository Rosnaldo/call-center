import { AuthenticatedWebSocket } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { broadcastMessage, sendToUser } from '#websocket/broadcast';
import { endActiveCall } from '#websocket/end_active_call';
import { removeFromIam } from 'src/services/users';
import logger from '#logger';

export const handleMessageLogout = async (
    ws: AuthenticatedWebSocket,
    hb: Heartbeat,
): Promise<void> => {
    logger.info({ userId: ws.user._id, email: ws.user.email }, 'ws client logged out');
    hb.stop();

    try {
        await endActiveCall(ws.traceId, ws.user._id);
        await removeFromIam(ws.user._id);

        sendToUser(ws.user._id, { event: 'user_logouted', data: { user: ws.user } });
        broadcastMessage({ event: 'online_users_broadcast', data: {} });
    } catch (error) {
        logger.error(error, 'ws handleMessageLogout: falha ao processar logout');
    }

    ws.terminate();
};
