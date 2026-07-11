import { AuthenticatedWebSocket, WsClientMessage } from '#websocket/types';
import { IOnlineUser, mapUserToOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { createHeartbeat } from '#websocket/heartbeat';
import { createGracePeriod } from '#websocket/grace_period';
import { notifyPartnerReconnected } from '#websocket/end_active_call';
import { handleClose } from '#websocket/handler/on_close';
import { handlePong } from '#websocket/handler/on_pong';
import { handleMessageHeartbeat } from '#websocket/handler/message/heartbeat';
import { handleMessageLogout } from '#websocket/handler/message/logout';
import { handleMessageRequestState } from '#websocket/handler/message/request_state';
import { clientRegistry } from '#websocket/client_registry';
import { syncAndSendCallState } from '#websocket/sync_call_state';
import { addToIam } from 'src/services/users';
import { publishOnlineUsersBroadcast } from 'src/services/realtime_events';
import logger from '#logger';

export const onConnection = () => async (ws: AuthenticatedWebSocket): Promise<void> => {
    logger.info({ userId: ws.user._id, email: ws.user.email, role: ws.user.role }, 'ws authenticated client connected');

    const wasDisconnecting = graceTimer.cancel(ws.user._id);
    if (wasDisconnecting) {
        await notifyPartnerReconnected(ws.traceId, ws.user._id);
    }
    clientRegistry.add(ws);

    const user: IOnlineUser = mapUserToOnlineUser(ws.user);
    const startGracePeriod = createGracePeriod(user, ws.traceId);

    const hb = createHeartbeat(ws, () => {
        ws.terminate();
    });

    ws.on('pong', () => handlePong(hb));

    ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString()) as WsClientMessage;
        switch (msg.event) {
            case 'heartbeat':
                handleMessageHeartbeat(ws, hb, user);
                break;
            case 'user_logout':
                handleMessageLogout(ws, hb);
                break;
            case 'request_state':
                handleMessageRequestState(ws);
                break;
        }
    });

    ws.on('close', () => {
        logger.info({ userId: ws.user._id, email: ws.user.email }, 'ws client disconnected');
        clientRegistry.remove(ws);
        handleClose(hb, startGracePeriod);
    });

    try {
        logger.info({ userId: user.id, name: user.name }, 'user connected');
        await addToIam(user);
        await syncAndSendCallState(ws.traceId, user.id);
        publishOnlineUsersBroadcast(ws.traceId);
    } catch (error) {
        logger.error(error, 'ws onConnection: falha ao sincronizar call ativa do usuário');
    }
};
