import WebSocket from 'ws';
import { IOnlineUser } from '@repo/shared-types';

export { IOnlineUser };

export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
    userEmail: string;
    userName: string;
}

export type WsEvent = 'online_users_updated';

export interface WsMessage<T = unknown> {
    event: WsEvent;
    data: T;
}
