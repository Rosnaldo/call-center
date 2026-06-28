import { IncomingCallState, IUser } from '@repo/shared-types';
import { EventEmitterTransport } from '#websocket/transport';

export interface AuthenticatedWebSocket extends EventEmitterTransport {
    user: IUser;
    token: string;
    isAlive: boolean;
}

export type WsEvent = 'online_users_updated' | 'heartbeat_ack' | 'user_logout' | 'incoming_call_sent' | 'incoming_call_received' | 'incoming_call_cancelled' | 'call_accepted' | 'call_accepted_broadcast' | 'call_completed' | 'call_completed_broadcast' | 'participant_joined' | 'participant_left';

export type WsClientEvent = 'heartbeat' | 'user_logout' | 'incoming_call_sent' | 'incoming_call_cancelled';

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
    | { event: 'incoming_call_sent'; data: IncomingCallData }
    | { event: 'incoming_call_cancelled'; data: CancelledCallData };

export interface WsMessage<T = unknown> {
    event: WsEvent;
    data: T;
}
