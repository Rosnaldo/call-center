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
// Real WebSocket clients answer ping frames with a pong automatically at the
// protocol level, which is what keeps the server-side heartbeat's `isAlive`
// flag true. This mock has no real socket underneath, so without simulating
// that here a connection left open across more than one heartbeat interval
// (30s) would be mistaken for dead and terminated by its own heartbeat.
export function createWsClient(user: IUser, token: string): AuthenticatedWebSocket {
    const transport = new EventEmitterTransport();
    const ws = transport as unknown as AuthenticatedWebSocket;
    ws.user = user;
    ws.token = token;
    ws.isAlive = true;
    (ws as unknown as EventEmitter).on('ping', () => (ws as unknown as EventEmitter).emit('pong'));
    return ws;
}

// Simulates a message arriving from the client side (e.g. user_logout).
// The connection handler listens on the 'message' event of the underlying EventEmitter.
export function simulateMessage(ws: AuthenticatedWebSocket, msg: Record<string, unknown>): void {
    (ws as unknown as EventEmitter).emit('message', JSON.stringify(msg));
}
