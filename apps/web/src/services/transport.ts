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

export const createWsTransport: TransportFactory = (url) =>
    new WebSocket(url) as unknown as ITransport;

export class EventEmitterTransport implements ITransport {
    readyState = TRANSPORT_OPEN;
    onopen: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;

    readonly sent: string[] = [];

    send(data: string): void {
        this.sent.push(data);
    }

    close(): void {
        this.readyState = TRANSPORT_CLOSED;
        this.onclose?.(new CloseEvent('close'));
    }

    simulateOpen(): void {
        this.onopen?.(new Event('open'));
    }

    simulateMessage(data: string): void {
        this.onmessage?.(new MessageEvent('message', { data }));
    }

    simulateError(): void {
        this.onerror?.(new Event('error'));
    }
}
