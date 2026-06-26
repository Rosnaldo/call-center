import { SOCKET_OPEN } from '#websocket/socket';
import { WsMessage } from '#websocket/types';
import { clientRegistry } from '#websocket/client_registry';

export const broadcastMessage = (payload: WsMessage<unknown>): void => {
    const message = JSON.stringify(payload);
    for (const client of clientRegistry) {
        if (client.readyState === SOCKET_OPEN) {
            client.send(message);
        }
    }
};

export const sendToUser = (userId: string, payload: WsMessage<unknown>): void => {
    const message = JSON.stringify(payload);
    for (const client of clientRegistry) {
        if (client.user?._id === userId && client.readyState === SOCKET_OPEN) {
            client.send(message);
        }
    }
};
