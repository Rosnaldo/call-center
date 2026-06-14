import WebSocket, { WebSocketServer } from 'ws';
import { AuthenticatedWebSocket, IOnlineUser, WsMessage } from '#websocket/types';

const broadcast = (wss: WebSocketServer, user: IOnlineUser): void => {
    const message = JSON.stringify({ event: 'online_users_updated', data: user } satisfies WsMessage<IOnlineUser>);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

export const onConnection = (wss: WebSocketServer) => (ws: AuthenticatedWebSocket): void => {
    const user = {
        id: ws.userId,
        name: ws.userName,
        email: ws.userEmail,
        isOnline: true,
    } as IOnlineUser;

    broadcast(wss, user);

    ws.on('close', () => {
        broadcast(wss, { ...user, isOnline: false });
    });
};
