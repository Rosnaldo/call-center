import { EventEmitter } from 'node:events';
import { IUser } from '@repo/shared-types';
import { EventEmitterTransport } from '../../../realtime/src/websocket/transport';
import { ISocketServer } from '../../../realtime/src/websocket/socket';
import { AuthenticatedWebSocket } from '../../../realtime/src/websocket/types';

// Minimal ISocketServer that tracks connected clients.
export class MockSocketServer implements ISocketServer {
    private readonly _clients = new Set<AuthenticatedWebSocket>();

    get clients(): Iterable<AuthenticatedWebSocket> {
        return this._clients;
    }

    add(ws: AuthenticatedWebSocket): void {
        this._clients.add(ws);
    }

    remove(ws: AuthenticatedWebSocket): void {
        this._clients.delete(ws);
    }

    clear(): void {
        this._clients.clear();
    }
}

// Wraps EventEmitterTransport with the AuthenticatedWebSocket fields expected by
// the realtime onConnection handler.
export function createWsClient(user: IUser, token: string): AuthenticatedWebSocket {
    const transport = new EventEmitterTransport();
    const ws = transport as unknown as AuthenticatedWebSocket;
    ws.user = user;
    ws.token = token;
    ws.isAlive = true;
    return ws;
}

// Collects every message sent via ws.send() into an array.
// The 'sent' event is emitted by EventEmitterTransport.send() but is not
// declared in the typed overloads, so we access it via the base EventEmitter.
export function collectSentMessages(ws: AuthenticatedWebSocket): string[] {
    const messages: string[] = [];
    (ws as unknown as EventEmitter).on('sent', (data: string) => {
        messages.push(data);
    });
    return messages;
}
