import { AuthenticatedWebSocket } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { notifyUserLoggedOut } from 'src/services/realtime_events';
import { getCallByUser } from 'src/services/calls';
import { ejectParticipant } from 'src/webhooks/daily_manager';
import logger from '#logger';

export const handleMessageLogout =  (
    ws: AuthenticatedWebSocket,
    hb: Heartbeat,
): void => {
    logger.info({ userId: ws.user._id, email: ws.user.email }, 'ws client logged out');
    hb.stop();

    notifyUserLoggedOut(ws.traceId, ws.user._id, ws.user);

    getCallByUser(ws.user._id)
        .then((call) => call && ejectParticipant(call.roomName, ws.user._id))
        .catch((error) => logger.error(error, 'logout: falha ao ejetar participante da room'));

    ws.terminate();
};
