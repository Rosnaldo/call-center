import { Heartbeat } from '#websocket/heartbeat';

type StartGracePeriod = (status?: 'disconnecting' | 'offline') => void;

export const handleClose = (hb: Heartbeat, startGracePeriod: StartGracePeriod): void => {
    hb.stop();
    startGracePeriod();
};
