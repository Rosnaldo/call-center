import WebSocket from 'ws';

class LogBroadcaster {
    private clients = new Set<WebSocket>();

    add(ws: WebSocket): void {
        this.clients.add(ws);
        ws.on('close', () => this.clients.delete(ws));
    }

    // pino DestinationStream compatible
    write(msg: string): void {
        for (const ws of this.clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg);
            }
        }
    }
}

export const logBroadcaster = new LogBroadcaster();
