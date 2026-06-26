import { AuthenticatedWebSocket, WsClientMessage } from '#websocket/types';
import { IOnlineUser, mapUserToOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { createHeartbeat } from '#websocket/heartbeat';
import { createGracePeriod } from '#websocket/grace_period';
import { handleOpen } from '#websocket/handler/on_open';
import { handleClose } from '#websocket/handler/on_close';
import { handlePong } from '#websocket/handler/on_pong';
import { handleMessageHeartbeat } from '#websocket/handler/message/heartbeat';
import { handleMessageLogout } from '#websocket/handler/message/logout';
import { clientRegistry } from '#websocket/client_registry';

export const onConnection = () => (ws: AuthenticatedWebSocket): void => {
    graceTimer.cancel(ws.user._id);
    clientRegistry.add(ws);

    const user: IOnlineUser = mapUserToOnlineUser(ws.user);
    const startGracePeriod = createGracePeriod(user);

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
                    handleMessageLogout(ws, hb, startGracePeriod);
                    break;
            }
        } catch {
            // malformed message — ignore
        }
    });

    handleOpen(user);

    ws.on('close', () => {
        clientRegistry.remove(ws);
        handleClose(hb, startGracePeriod);
    });
};
