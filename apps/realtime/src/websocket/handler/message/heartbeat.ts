import { AuthenticatedWebSocket, WsMessage } from '#websocket/types';
import { Heartbeat } from '#websocket/heartbeat';
import { SOCKET_OPEN } from '#websocket/socket';
import { IOnlineUser } from '@repo/shared-types';
import { addToIam, touchOnlineUser } from 'src/services/users';
import logger from '#logger';

// `user` is a snapshot frozen at connection time (status defaults to 'idle')
// — addToIam does a full overwrite, so calling it on every heartbeat used to
// stomp any status set afterward (e.g. 'in-call') back to that stale
// snapshot every ~30s. touchOnlineUser only refreshes the TTL, preserving
// whatever's actually there; addToIam is now just the fallback for when the
// presence entry has genuinely expired (e.g. missed heartbeats).
const refreshPresence = async (user: IOnlineUser): Promise<void> => {
    const existed = await touchOnlineUser(user.id);
    if (!existed) await addToIam(user);
};

export const handleMessageHeartbeat = (ws: AuthenticatedWebSocket, hb: Heartbeat, user: IOnlineUser): void => {
    hb.beat();
    refreshPresence(user).catch((error) => logger.error(error, 'heartbeat: falha ao renovar presença do usuário no iam'));
    if (ws.readyState === SOCKET_OPEN) {
        ws.send(JSON.stringify({ event: 'heartbeat_ack' } satisfies Pick<WsMessage, 'event'>));
    }
};
