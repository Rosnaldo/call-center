import { IUser } from '@repo/shared-types';
import { ISocket } from '#websocket/socket';

export interface AuthenticatedWebSocket extends ISocket {
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
