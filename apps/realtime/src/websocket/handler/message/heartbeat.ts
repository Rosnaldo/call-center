import { AuthenticatedWebSocket, WsMessage } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { SOCKET_OPEN } from '#websocket/socket';

export const handleMessageHeartbeat = (ws: AuthenticatedWebSocket, hb: Heartbeat): void => {
    hb.beat();
    if (ws.readyState === SOCKET_OPEN) {
        ws.send(JSON.stringify({ event: 'heartbeat_ack' } satisfies Pick<WsMessage, 'event'>));
    }
};
