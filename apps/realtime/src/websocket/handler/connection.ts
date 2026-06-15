import WebSocket, { WebSocketServer } from 'ws';
import { AuthenticatedWebSocket, WsClientMessage, WsMessage } from '#websocket/types';
import { addToIam, removeFromIam } from 'src/services/users';
import { IOnlineUser, mapUserToOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { createHeartbeat } from '#websocket/heartbeat';

const broadcastMessage = (wss: WebSocketServer, payload: WsMessage<unknown>): void => {
    const message = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

export const onConnection = (wss: WebSocketServer) => (ws: AuthenticatedWebSocket): void => {
    const token = ws.token;
    graceTimer.cancel(ws.user._id);

    const user: IOnlineUser = mapUserToOnlineUser(ws.user);

    const startGracePeriod = (status: 'disconnecting' | 'offline' = 'disconnecting') => {
        graceTimer.start(
            user.id,
            () => {
                const transitionUser: IOnlineUser = { ...user, status };
                broadcastMessage(wss, { event: 'online_users_updated', data: transitionUser });
                addToIam(transitionUser, token);
            },
            () => {
                broadcastMessage(wss, { event: 'user_logout', data: { id: user.id } });
                removeFromIam(user.id, token);
            },
        );
    };

    const hb = createHeartbeat(ws, () => {
        startGracePeriod();
        ws.terminate();
    });

    ws.on('pong', () => hb.beat());

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString()) as WsClientMessage;
            switch (msg.event) {
                case 'heartbeat':
                    hb.beat();
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ event: 'heartbeat_ack' } satisfies Pick<WsMessage, 'event'>));
                    }
                    break;
                case 'user_logout':
                    hb.stop();
                    startGracePeriod('offline');
                    ws.terminate();
                    break;
            }
        } catch {
            // malformed message — ignore
        }
    });

    broadcastMessage(wss, { event: 'online_users_updated', data: user });
    addToIam(user, token);

    ws.on('close', () => {
        hb.stop();
        startGracePeriod();
    });
};
