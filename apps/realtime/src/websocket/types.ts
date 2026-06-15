import WebSocket from 'ws';
import { IUser } from '@repo/shared-types';

export interface AuthenticatedWebSocket extends WebSocket {
    user: IUser;
    token: string;
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
