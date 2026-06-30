import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import url from 'url';
import { iamApi } from '#apis/iam';
import { logBroadcaster } from './log_broadcaster';
import logger from '#logger';

async function verifyToken(token: string): Promise<void> {
    await iamApi.post('/auth/validate-token', {}, {
        headers: { Authorization: token },
    });
}

export function createLogWebSocketServer(server: Server): WebSocketServer {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
        const parsedUrl = url.parse(req.url ?? '', true);
        if (parsedUrl.pathname !== '/logs') return;

        const token = parsedUrl.query['token'] as string | undefined;
        if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        verifyToken(token)
            .then(() => {
                wss.handleUpgrade(req, socket, head, (ws) => {
                    logBroadcaster.add(ws);
                    logger.info('log ws client connected');
                });
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'Authentication failed';
                logger.error({ err: message }, 'log ws auth failed');
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
            });
    });

    return wss;
}
