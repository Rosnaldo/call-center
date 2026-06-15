import { AuthenticatedWebSocket } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';

type StartGracePeriod = (status?: 'disconnecting' | 'offline') => void;

export const handleMessageLogout = (
    ws: AuthenticatedWebSocket,
    hb: Heartbeat,
    startGracePeriod: StartGracePeriod,
): void => {
    hb.stop();
    startGracePeriod('offline');
    ws.terminate();
};
