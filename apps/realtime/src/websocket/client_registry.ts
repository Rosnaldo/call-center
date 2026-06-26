import { AuthenticatedWebSocket } from '#websocket/types';

const clients = new Set<AuthenticatedWebSocket>();

export const clientRegistry = {
    add(ws: AuthenticatedWebSocket): void {
        clients.add(ws);
    },
    remove(ws: AuthenticatedWebSocket): void {
        clients.delete(ws);
    },
    clear(): void {
        clients.clear();
    },
    [Symbol.iterator](): IterableIterator<AuthenticatedWebSocket> {
        return clients[Symbol.iterator]();
    },
};
