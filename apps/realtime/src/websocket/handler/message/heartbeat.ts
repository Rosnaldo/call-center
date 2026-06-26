import { AuthenticatedWebSocket, WsMessage } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { SOCKET_OPEN } from '#websocket/socket';
import { IOnlineUser } from '@repo/shared-types';
import { addToIam } from 'src/services/users';

export const handleMessageHeartbeat = (ws: AuthenticatedWebSocket, hb: Heartbeat, user: IOnlineUser): void => {
    hb.beat();
    addToIam(user, ws.token).catch(() => {});
    if (ws.readyState === SOCKET_OPEN) {
        ws.send(JSON.stringify({ event: 'heartbeat_ack' } satisfies Pick<WsMessage, 'event'>));
    }
};
