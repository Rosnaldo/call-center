import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import url from 'url';
import { iamApi } from '#apis/iam';
import { AuthenticatedWebSocket } from './types';
import { ISocketServer } from './socket';
import { WsTransport } from './transport';
import { onConnection } from './connection';
import { userExists } from 'src/services/users';
import { IUser } from '@repo/shared-types';
import { buildLogger } from '#logger';
import { randomUUID } from 'crypto';

interface IamValidateResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

async function verifyToken(traceId: string, token: string): Promise<IamValidateResponse> {
    const { createIamClient } = await import('src/apis/iam');
    const response = await createIamClient(traceId).post<IamValidateResponse>('/auth/validate-token', {}, {
        headers: { Authorization: token },
    });
    return response.data;
}

export function createWebSocketServer(server: Server): ISocketServer {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (req, socket, head) => {
        const parsedUrl = url.parse(req.url ?? '', true);
        if (parsedUrl.pathname === '/logs') return;

        const token = parsedUrl.query['token'] as string | undefined;

        if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        const traceId = (req.headers['x-trace-id'] as string) || randomUUID();
        const logger = buildLogger(traceId);

        try {
            const tokenUser = await verifyToken(traceId, token);
            const fullUser: IUser = await userExists(traceId, tokenUser.email, token);

            wss.handleUpgrade(req, socket, head, (ws) => {
                logger.info({ userId: fullUser._id, email: fullUser.email, role: fullUser.role }, 'ws upgrade successful');
                const transport = new WsTransport(ws);
                const authWs = transport as unknown as AuthenticatedWebSocket;
                authWs.user = fullUser;
                authWs.token = token;
                authWs.traceId = traceId;
                authWs.isAlive = false;
                wss.emit('connection', authWs, req);
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Authentication failed';
            logger.error({ err: message }, 'ws auth failed');
            wss.handleUpgrade(req, socket, head, (ws) => {
                ws.send(JSON.stringify({ isError: true, message }), () => ws.close());
            });
        }
    });

    wss.on('connection', onConnection() as unknown as (ws: WebSocket) => void);

    return wss as unknown as ISocketServer;
}
