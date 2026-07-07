import { AuthenticatedWebSocket } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { broadcastMessage } from '#websocket/broadcast';
import { endActiveCall } from '#websocket/end_active_call';
import logger from '#logger';

type StartGracePeriod = (status?: 'disconnecting' | 'offline') => void;

export const handleMessageLogout = (
    ws: AuthenticatedWebSocket,
    hb: Heartbeat,
    startGracePeriod: StartGracePeriod,
): void => {
    logger.info({ userId: ws.user._id, email: ws.user.email }, 'ws client logged out');
    hb.stop();
    broadcastMessage({ event: 'user_logouted', data: { id: ws.user._id } });
    startGracePeriod('offline');
    endActiveCall(ws.user._id);
    ws.terminate();
};
