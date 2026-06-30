import { AuthenticatedWebSocket } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import logger from '#logger';

type StartGracePeriod = (status?: 'disconnecting' | 'offline') => void;

export const handleMessageLogout = (
    ws: AuthenticatedWebSocket,
    hb: Heartbeat,
    startGracePeriod: StartGracePeriod,
): void => {
    logger.info({ userId: ws.user._id, email: ws.user.email }, 'ws client logged out');
    hb.stop();
    startGracePeriod('offline');
    ws.terminate();
};
