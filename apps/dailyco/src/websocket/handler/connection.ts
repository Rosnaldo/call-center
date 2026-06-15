import WebSocket, { WebSocketServer } from 'ws';
import { AuthenticatedWebSocket, WsClientMessage, WsMessage } from '#websocket/types';
import { addToIam, removeFromIam } from 'src/services/users';
import { IOnlineUser, mapUserToOnlineUser } from '@repo/shared-types';

const HEARTBEAT_INTERVAL_MS = 30_000;
const GRACE_PERIOD_MS = 30_000;

const disconnectingTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

    // Cancel any pending grace period — user reconnected in time
    const pendingTimer = disconnectingTimers.get(ws.user._id);
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        disconnectingTimers.delete(ws.user._id);
    }

    const user: IOnlineUser = mapUserToOnlineUser(ws.user);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    const heartbeat = setInterval(() => {
        if (!ws.isAlive) {
            clearInterval(heartbeat);
            startGracePeriod();
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    }, HEARTBEAT_INTERVAL_MS);

    const startGracePeriod = () => {
        if (disconnectingTimers.has(user.id)) return;

        const disconnectingUser: IOnlineUser = { ...user, status: 'disconnecting' };
        broadcastMessage(wss, { event: 'online_users_updated', data: disconnectingUser });
        addToIam(disconnectingUser, token);

        const timer = setTimeout(() => {
            disconnectingTimers.delete(user.id);
            const offlineUser: IOnlineUser = { ...user, isOnline: false };
            broadcastMessage(wss, { event: 'online_users_updated', data: offlineUser });
            removeFromIam(user.id, token);
        }, GRACE_PERIOD_MS);

        disconnectingTimers.set(user.id, timer);
    };

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString()) as WsClientMessage;
            switch (msg.event) {
                case 'heartbeat':
                    ws.isAlive = true;
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ event: 'heartbeat_ack' } satisfies Pick<WsMessage, 'event'>));
                    }
                    break;
                case 'user_logout':
                    clearInterval(heartbeat);
                    broadcastMessage(wss, { event: 'user_logout', data: { id: user.id } });
                    removeFromIam(user.id, token);
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
        clearInterval(heartbeat);
        startGracePeriod();
    });
};
