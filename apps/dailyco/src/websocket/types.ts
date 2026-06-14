import WebSocket from 'ws';

export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
    userEmail: string;
    userName: string;
}

export interface OnlineUserData {
    id: string;
    name: string;
    email: string;
}

export type WsEvent = 'online_users_updated';

export interface WsMessage<T = unknown> {
    event: WsEvent;
    data: T;
}
