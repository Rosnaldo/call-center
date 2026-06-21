import { IncomingCallState, IUser } from '@repo/shared-types';
import { EventEmitterTransport } from '#websocket/transport';

export interface AuthenticatedWebSocket extends EventEmitterTransport {
    user: IUser;
    token: string;
    isAlive: boolean;
}

export type WsEvent = 'online_users_updated' | 'heartbeat_ack' | 'user_logout' | 'send_incoming_call' | 'cancel_incoming_call';

export type WsClientEvent = 'heartbeat' | 'user_logout' | 'send_incoming_call' | 'cancel_incoming_call';

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
    | { event: 'send_incoming_call'; data: IncomingCallData }
    | { event: 'cancel_incoming_call'; data: CancelledCallData };

export interface WsMessage<T = unknown> {
    event: WsEvent;
    data: T;
}
