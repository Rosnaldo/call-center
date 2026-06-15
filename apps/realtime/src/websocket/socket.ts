export const SOCKET_OPEN = 1; // WebSocket.OPEN

export interface IClientSocket {
    readonly readyState: number;
    send(data: string): void;
}

export interface ISocket extends IClientSocket {
    terminate(): void;
    ping(): void;
    on(event: 'pong', listener: () => void): void;
    on(event: 'message', listener: (raw: Buffer | string) => void): void;
    on(event: 'close', listener: () => void): void;
}

export interface ISocketServer {
    readonly clients: Iterable<IClientSocket>;
}
