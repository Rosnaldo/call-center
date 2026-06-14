import WebSocket, { WebSocketServer } from 'ws';
import { AuthenticatedWebSocket, IOnlineUser, WsClientMessage, WsMessage } from '#websocket/types';
import { iamApi } from '#apis/iam';

const HEARTBEAT_INTERVAL_MS = 30_000;
const GRACE_PERIOD_MS = 30_000;

const disconnectingTimers = new Map<string, ReturnType<typeof setTimeout>>();

const syncToIam = (user: IOnlineUser, token: string): void => {
    iamApi.post('/online-users/add', user, {
        headers: { Authorization: token },
    }).catch((err) => console.error('[IAM] sync failed:', err));
};

const removeFromIam = (userId: string, token: string): void => {
    iamApi.delete('/online-users/remove', {
        headers: { Authorization: token },
        data: { id: userId },
    }).catch((err) => console.error('[IAM] remove failed:', err));
};

const broadcastMessage = (wss: WebSocketServer, payload: WsMessage<unknown>): void => {
    const message = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

export const onConnection = (wss: WebSocketServer) => (ws: AuthenticatedWebSocket): void => {
    const token = ws.userToken;

    // Cancel any pending grace period — user reconnected in time
    const pendingTimer = disconnectingTimers.get(ws.userId);
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        disconnectingTimers.delete(ws.userId);
    }

    const user: IOnlineUser = {
        id: ws.userId,
        name: ws.userName,
        email: ws.userEmail,
        isOnline: true,
        status: 'idle',
    } as IOnlineUser;

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
        syncToIam(disconnectingUser, token);

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
    syncToIam(user, token);

    ws.on('close', () => {
        clearInterval(heartbeat);
        startGracePeriod();
    });
};
