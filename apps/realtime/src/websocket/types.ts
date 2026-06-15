import { IUser } from '@repo/shared-types';
import { EventEmitterTransport } from '#websocket/transport';

export interface AuthenticatedWebSocket extends EventEmitterTransport {
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
