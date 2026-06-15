import { Heartbeat } from '#websocket/heartbeat';

export const handlePong = (hb: Heartbeat): void => {
    hb.beat();
};
