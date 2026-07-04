import { SOCKET_OPEN } from '#websocket/socket';
import { WsMessage } from '#websocket/types';
import { clientRegistry } from '#websocket/client_registry';
import logger from '#logger';

export const broadcastMessage = (payload: WsMessage<unknown>): void => {
    const message = JSON.stringify(payload);
    for (const client of clientRegistry) {
        if (client.readyState === SOCKET_OPEN) {
            logger.info(`${ message } - broadcasting message to client`);
            client.send(message);
        }
    }
};

export const sendToUser = (userId: string, payload: WsMessage<unknown>): void => {
    const message = JSON.stringify(payload);
    for (const client of clientRegistry) {
        if (client.user?._id === userId && client.readyState === SOCKET_OPEN) {
            logger.info(`${ message } - sending message to user: ${ userId }`);
            client.send(message);
        }
    }
};
