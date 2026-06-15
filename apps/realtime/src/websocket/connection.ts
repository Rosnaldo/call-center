import { AuthenticatedWebSocket, WsClientMessage } from '#websocket/types';
import { ISocketServer } from '#websocket/socket';
import { IOnlineUser, mapUserToOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { createHeartbeat } from '#websocket/heartbeat';
import { createGracePeriod } from '#websocket/grace_period';
import { handleOpen } from '#websocket/handler/on_open';
import { handleClose } from '#websocket/handler/on_close';
import { handlePong } from '#websocket/handler/on_pong';
import { handleMessageHeartbeat } from '#websocket/handler/message/heartbeat';
import { handleMessageLogout } from '#websocket/handler/message/logout';

export const onConnection = (wss: ISocketServer) => (ws: AuthenticatedWebSocket): void => {
    const token = ws.token;
    graceTimer.cancel(ws.user._id);

    const user: IOnlineUser = mapUserToOnlineUser(ws.user);
    const startGracePeriod = createGracePeriod(wss, user, token);

    const hb = createHeartbeat(ws, () => {
        // startGracePeriod();
        ws.terminate();
    });

    ws.on('pong', () => handlePong(hb));

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString()) as WsClientMessage;
            switch (msg.event) {
                case 'heartbeat':
                    handleMessageHeartbeat(ws, hb);
                    break;
                case 'user_logout':
                    handleMessageLogout(ws, hb, startGracePeriod);
                    break;
            }
        } catch {
            // malformed message — ignore
        }
    });

    handleOpen(wss, user, token);

    ws.on('close', () => handleClose(hb, startGracePeriod));
};
