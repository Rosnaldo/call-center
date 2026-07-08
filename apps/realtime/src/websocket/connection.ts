import { AuthenticatedWebSocket, WsClientMessage } from '#websocket/types';
import { IOnlineUser, mapUserToOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { createHeartbeat } from '#websocket/heartbeat';
import { createGracePeriod } from '#websocket/grace_period';
import { notifyPartnerReconnected } from '#websocket/end_active_call';
import { handleOpen } from '#websocket/handler/on_open';
import { handleClose } from '#websocket/handler/on_close';
import { handlePong } from '#websocket/handler/on_pong';
import { handleMessageHeartbeat } from '#websocket/handler/message/heartbeat';
import { handleMessageLogout } from '#websocket/handler/message/logout';
import { clientRegistry } from '#websocket/client_registry';
import logger from '#logger';

export const onConnection = () => (ws: AuthenticatedWebSocket): void => {
    logger.info({ userId: ws.user._id, email: ws.user.email, role: ws.user.role }, 'ws authenticated client connected');
    // Cancels any pending "disconnecting" grace period for this user — since
    // that timer is what would otherwise end their active call, reconnecting
    // in time both keeps their presence and saves the call. Only the call
    // partner is told directly (not a broadcast) — handleOpen below still
    // covers the generic online-users-list refresh for everyone else.
    const wasDisconnecting = graceTimer.cancel(ws.user._id);
    if (wasDisconnecting) {
        notifyPartnerReconnected(ws.user._id);
    }
    clientRegistry.add(ws);

    const user: IOnlineUser = mapUserToOnlineUser(ws.user);
    const startGracePeriod = createGracePeriod(user, ws.traceId);

    const hb = createHeartbeat(ws, () => {
        ws.terminate();
    });

    ws.on('pong', () => handlePong(hb));

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString()) as WsClientMessage;
            switch (msg.event) {
                case 'heartbeat':
                    handleMessageHeartbeat(ws, hb, user);
                    break;
                case 'user_logout':
                    handleMessageLogout(ws, hb);
                    break;
            }
        } catch {
            // malformed message — ignore
        }
    });

    handleOpen(user);

    ws.on('close', () => {
        logger.info({ userId: ws.user._id, email: ws.user.email }, 'ws client disconnected');
        clientRegistry.remove(ws);
        handleClose(hb, startGracePeriod);
    });
};
