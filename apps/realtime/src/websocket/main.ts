import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { AuthenticatedWebSocket } from './types';
import { ISocketServer } from './socket';
import { WsTransport } from './transport';
import { onConnection } from './connection';
import { userExists } from 'src/services/users';
import { verifyToken } from 'src/auth/verify_token';
import { IUser } from '@repo/shared-types';
import { buildLogger } from '#logger';
import { randomUUID } from 'crypto';

const AUTH_TIMEOUT_MS = 5_000;

export function createWebSocketServer(server: Server): ISocketServer {
    const wss = new WebSocketServer({ noServer: true });

    // Auth happens off the first message sent over the socket instead of a
    // `?token=` query param on the upgrade request, so the JWT doesn't end up
    // in proxy/CDN access logs or browser history.
    function authenticateOnFirstMessage(ws: WebSocket, traceId: string): void {
        const logger = buildLogger(traceId);

        const timeout = setTimeout(() => {
            logger.warn({}, 'ws auth timeout');
            ws.send(JSON.stringify({ isError: true, message: 'Authentication timeout' }), () => ws.close());
        }, AUTH_TIMEOUT_MS);

        ws.once('message', async (raw) => {
            clearTimeout(timeout);
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.event !== 'auth' || typeof msg.token !== 'string' || !msg.token) {
                    throw new Error('Primeira mensagem deve ser de autenticação');
                }

                const tokenUser = await verifyToken(traceId, msg.token);
                const fullUser: IUser = await userExists(traceId, tokenUser.email, msg.token);

                logger.info({ userId: fullUser._id, email: fullUser.email, role: fullUser.role }, 'ws upgrade successful');
                const transport = new WsTransport(ws);
                const authWs = transport as unknown as AuthenticatedWebSocket;
                authWs.user = fullUser;
                authWs.token = msg.token;
                authWs.traceId = traceId;
                authWs.isAlive = false;
                wss.emit('connection', authWs);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Authentication failed';
                logger.error({ err: message }, 'ws auth failed');
                ws.send(JSON.stringify({ isError: true, message }), () => ws.close());
            }
        });
    }

    server.on('upgrade', (req, socket, head) => {
        const parsedUrl = new URL(req.url ?? '', 'http://localhost');
        if (parsedUrl.pathname === '/logs') return;

        const traceId = (req.headers['x-trace-id'] as string) || randomUUID();

        wss.handleUpgrade(req, socket, head, (ws) => {
            authenticateOnFirstMessage(ws, traceId);
        });
    });

    wss.on('connection', onConnection() as unknown as (ws: WebSocket) => void);

    return wss as unknown as ISocketServer;
}
