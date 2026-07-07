import { Heartbeat } from '#websocket/heartbeat';
import { broadcastMessage } from '#websocket/broadcast';
import { endActiveCall } from '#websocket/end_active_call';

type StartGracePeriod = (status?: 'disconnecting' | 'offline') => void;

export const handleClose = (userId: string, hb: Heartbeat, startGracePeriod: StartGracePeriod): void => {
    hb.stop();
    broadcastMessage({ event: 'user_disconnected', data: { id: userId } });
    startGracePeriod();
    endActiveCall(userId);
};
