import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import url from 'url';
import { iamApi } from '#apis/iam';
import { AuthenticatedWebSocket } from './types';
import { onConnection } from './handler/connection';

interface IamValidateResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

async function verifyToken(token: string): Promise<IamValidateResponse> {
    const response = await iamApi.post<IamValidateResponse>('/auth/validate-token', {}, {
        headers: { Authorization: token },
    });
    return response.data;
}

export function createWebSocketServer(server: Server): WebSocketServer {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
        const parsedUrl = url.parse(req.url ?? '', true);
        const token = parsedUrl.query['token'] as string | undefined;

        if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        verifyToken(token)
            .then((user) => {
                wss.handleUpgrade(req, socket, head, (ws) => {
                    const authWs = ws as AuthenticatedWebSocket;
                    authWs.userId = user.id;
                    authWs.userEmail = user.email ?? '';
                    authWs.userName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                    authWs.userToken = token;
                    wss.emit('connection', authWs, req);
                });
            })
            .catch(() => {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
            });
    });

    wss.on('connection', onConnection(wss) as (ws: WebSocket) => void);

    return wss;
}
