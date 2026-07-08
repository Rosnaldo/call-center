import { Heartbeat } from '#websocket/heartbeat';

type StartGracePeriod = () => void;

export const handleClose = (hb: Heartbeat, startGracePeriod: StartGracePeriod): void => {
    hb.stop();
    startGracePeriod();
};
