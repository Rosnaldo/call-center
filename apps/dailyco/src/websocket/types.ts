import WebSocket from 'ws';
import { IOnlineUser } from '@repo/shared-types';

export { IOnlineUser };

export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
    userEmail: string;
    userName: string;
    userToken: string;
    isAlive: boolean;
}

export type WsEvent = 'online_users_updated' | 'heartbeat_ack' | 'user_logout';

export type WsClientEvent = 'heartbeat' | 'user_logout';

export interface WsClientMessage {
    event: WsClientEvent;
}

export interface WsMessage<T = unknown> {
    event: WsEvent;
    data: T;
}
