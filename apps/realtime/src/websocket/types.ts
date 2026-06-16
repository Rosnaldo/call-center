import { IUser } from '@repo/shared-types';
import { EventEmitterTransport } from '#websocket/transport';

export interface AuthenticatedWebSocket extends EventEmitterTransport {
    user: IUser;
    token: string;
    isAlive: boolean;
}

export type WsEvent = 'online_users_updated' | 'heartbeat_ack' | 'user_logout' | 'incoming_call';

export type WsClientEvent = 'heartbeat' | 'user_logout' | 'incoming_call';

export interface IncomingCallData {
    targetUserId: string;
    call: {
        id: string;
        customerId: string;
        customerName: string;
        attendantId: string;
        attendantName: string;
        roomUrl: string;
        status: 'awaiting-answer';
        tokensCharged?: number;
    };
}

export type WsClientMessage =
    | { event: 'heartbeat' }
    | { event: 'user_logout' }
    | { event: 'incoming_call'; data: IncomingCallData };

export interface WsMessage<T = unknown> {
    event: WsEvent;
    data: T;
}
