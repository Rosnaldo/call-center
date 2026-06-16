import { ISocketServer, SOCKET_OPEN } from '#websocket/socket';
import { AuthenticatedWebSocket, WsMessage } from '#websocket/types';

export const broadcastMessage = (wss: ISocketServer, payload: WsMessage<unknown>): void => {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
        if (client.readyState === SOCKET_OPEN) {
            client.send(message);
        }
    }
};

export const sendToUser = (wss: ISocketServer, userId: string, payload: WsMessage<unknown>): void => {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
        const authClient = client as unknown as AuthenticatedWebSocket;
        if (authClient.user?._id === userId && client.readyState === SOCKET_OPEN) {
            client.send(message);
        }
    }
};
