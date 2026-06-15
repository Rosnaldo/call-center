import { ISocket } from '#websocket/socket';

const HEARTBEAT_INTERVAL_MS = 30_000;

interface Heartbeat {
    beat(): void;
    stop(): void;
}

export function createHeartbeat(ws: ISocket & { isAlive: boolean }, onDead: () => void): Heartbeat {
    ws.isAlive = true;

    const interval = setInterval(() => {
        if (!ws.isAlive) {
            stop();
            onDead();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    }, HEARTBEAT_INTERVAL_MS);

    const stop = () => clearInterval(interval);

    return {
        beat() { ws.isAlive = true; },
        stop,
    };
}
