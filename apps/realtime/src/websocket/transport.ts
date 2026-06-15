import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { ISocket, SOCKET_OPEN } from '#websocket/socket';

const SOCKET_CLOSED = 3;

export class EventEmitterTransport extends EventEmitter implements ISocket {
    protected _readyState: number;

    get readyState(): number {
        return this._readyState;
    }

    constructor(readyState = SOCKET_OPEN) {
        super();
        this._readyState = readyState;
    }

    on(event: 'pong', listener: () => void): this;
    on(event: 'message', listener: (raw: Buffer | string) => void): this;
    on(event: 'close', listener: () => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    send(data: string): void {
        this.emit('sent', data);
    }

    terminate(): void {
        this._readyState = SOCKET_CLOSED;
        this.emit('close');
    }

    ping(): void {
        this.emit('ping');
    }
}

export class WsTransport extends EventEmitterTransport {
    private readonly ws: WebSocket;

    constructor(ws: WebSocket) {
        super(ws.readyState);
        this.ws = ws;
        ws.on('pong', () => this.emit('pong'));
        ws.on('message', (raw) => this.emit('message', raw));
        ws.on('close', () => this.emit('close'));
    }

    override get readyState(): number {
        return this.ws.readyState;
    }

    override send(data: string): void {
        this.ws.send(data);
    }

    override terminate(): void {
        this.ws.terminate();
    }

    override ping(): void {
        this.ws.ping();
    }
}
