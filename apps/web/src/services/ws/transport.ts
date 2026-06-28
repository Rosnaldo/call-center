import { EventEmitter } from 'events';

export const TRANSPORT_OPEN = 1;
const TRANSPORT_CLOSED = 3;

export interface ITransport {
    readonly readyState: number;
    onopen: ((ev: Event) => void) | null;
    onmessage: ((ev: MessageEvent) => void) | null;
    onerror: ((ev: Event) => void) | null;
    onclose: ((ev: CloseEvent) => void) | null;
    send(data: string): void;
    close(): void;
}

export type TransportFactory = (url: string) => ITransport;

export interface AuthenticatedWebSocket extends ITransport {
    token: string;
}

export const createWsTransport: TransportFactory = (url) =>
    new WebSocket(url) as unknown as ITransport;

export interface ISocket {
    readonly readyState: number;
    send(data: string): void;
    terminate(): void;
    ping(): void;
    on(event: 'pong', listener: () => void): void;
    on(event: 'message', listener: (raw: Buffer | string) => void): void;
    on(event: 'close', listener: () => void): void;
}

export class EventEmitterTransport extends EventEmitter implements ISocket {
    protected _readyState: number;

    get readyState(): number {
        return this._readyState;
    }

    constructor(readyState = TRANSPORT_OPEN) {
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
        this._readyState = TRANSPORT_CLOSED;
        this.emit('close');
    }

    ping(): void {
        this.emit('ping');
    }
}
