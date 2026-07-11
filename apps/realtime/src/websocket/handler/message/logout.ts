import { AuthenticatedWebSocket } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { notifyUserLoggedOut } from 'src/services/realtime_events';
import logger from '#logger';

export const handleMessageLogout =  (
    ws: AuthenticatedWebSocket,
    hb: Heartbeat,
): void => {
    logger.info({ userId: ws.user._id, email: ws.user.email }, 'ws client logged out');
    hb.stop();

    notifyUserLoggedOut(ws.traceId, ws.user._id, ws.user);

    ws.terminate();
};
