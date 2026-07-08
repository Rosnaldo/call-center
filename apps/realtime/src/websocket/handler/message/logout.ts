import { AuthenticatedWebSocket } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { broadcastMessage } from '#websocket/broadcast';
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
        broadcastMessage({ event: 'user_logouted', data: { id: ws.user._id } });

        // Must run before removeFromIam below — /calls/complete needs both
        // participants' online_user records to still be in redis, and
        // removeFromIam would delete this user's own record first otherwise.
        await endActiveCall(ws.traceId, ws.user._id);

        try {
            await removeFromIam(ws.user._id);
            broadcastMessage({ event: 'online_users_broadcast', data: {} });
        } catch (error) {
            logger.error(error, 'ws handleMessageLogout: falha ao remover usuário do iam');
        }
    } catch (error) {
        logger.error(error, 'ws handleMessageLogout: falha ao processar logout');
    }

    ws.terminate();
};
