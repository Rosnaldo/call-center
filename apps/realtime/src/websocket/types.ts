import { IncomingCallState, IUser } from '@repo/shared-types';
import { EventEmitterTransport } from '#websocket/transport';

export interface AuthenticatedWebSocket extends EventEmitterTransport {
    user: IUser;
    token: string;
    isAlive: boolean;
}

export type WsEvent = 'online_users_updated' | 'heartbeat_ack' | 'user_logout' | 'incoming_call' | 'call_cancelled';

export type WsClientEvent = 'heartbeat' | 'user_logout' | 'incoming_call' | 'call_cancelled';

export interface IncomingCallData {
    targetUserId: string;
    incomingCall: IncomingCallState;
}

export interface CancelledCallData {
    targetUserId: string;
}

export type WsClientMessage =
    | { event: 'heartbeat' }
    | { event: 'user_logout' }
    | { event: 'incoming_call'; data: IncomingCallData }
    | { event: 'call_cancelled'; data: CancelledCallData };

export interface WsMessage<T = unknown> {
    event: WsEvent;
    data: T;
}
