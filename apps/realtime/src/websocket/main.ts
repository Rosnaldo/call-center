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

export function createWebSocketServer(server: Server): ISocketServer {
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
            .then((tokenUser) => userExists(tokenUser.email, token))
            .then((fullUser: IUser) => {
                wss.handleUpgrade(req, socket, head, (ws) => {
                    const transport = new WsTransport(ws);
                    const authWs = transport as unknown as AuthenticatedWebSocket;
                    authWs.user = fullUser;
                    authWs.token = token;
                    authWs.isAlive = false;
                    wss.emit('connection', authWs, req);
                });
            })
            .catch(() => {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
            });
    });

    wss.on('connection', onConnection(wss) as unknown as (ws: WebSocket) => void);

    return wss as unknown as ISocketServer;
}
