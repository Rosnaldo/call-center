import { AuthenticatedWebSocket } from '#websocket/types';
import { sendToUser } from '#websocket/broadcast';
import { syncAndSendCallState } from '#websocket/sync_call_state';
import logger from '#logger';

// A tab that isn't holding the real socket (see InitWs on the web side) has
// no connect event of its own to trigger the usual onConnection sync, so it
// asks the leader tab to relay this instead — same result as a fresh
// connect, without actually reconnecting.
export const handleMessageRequestState = (ws: AuthenticatedWebSocket): void => {
    syncAndSendCallState(ws.traceId, ws.user._id)
        .then(() => sendToUser(ws.user._id, { event: 'online_users_broadcast', data: {} }))
        .catch((error) => logger.error(error, 'request_state: falha ao sincronizar estado do usuário'));
};
