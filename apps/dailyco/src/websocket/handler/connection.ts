import WebSocket, { WebSocketServer } from 'ws';
import { AuthenticatedWebSocket, OnlineUserData, WsMessage } from '#websocket/types';
import { addOnlineUser, removeOnlineUser, getOnlineUsers } from '#websocket/service/online_users';

const broadcast = (wss: WebSocketServer, event: WsMessage['event'], data: unknown): void => {
    const message = JSON.stringify({ event, data } satisfies WsMessage);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

export const onConnection = (wss: WebSocketServer) => (ws: AuthenticatedWebSocket): void => {
    const user: OnlineUserData = {
        id: ws.userId,
        name: ws.userName,
        email: ws.userEmail,
    };

    addOnlineUser(user);
    broadcast(wss, 'online_users_updated', getOnlineUsers());

    ws.on('close', () => {
        removeOnlineUser(ws.userId);
        broadcast(wss, 'online_users_updated', getOnlineUsers());
    });
};
