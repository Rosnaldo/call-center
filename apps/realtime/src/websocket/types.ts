import { IncomingCallState, IUser } from '@repo/shared-types';
import { EventEmitterTransport } from '#websocket/transport';

export interface AuthenticatedWebSocket extends EventEmitterTransport {
    user: IUser;
    token: string;
    traceId: string;
    isAlive: boolean;
}

export type WsEvent = 'add_to_online_users' | 'remove_from_online_users' | 'online_users_broadcast' | 'heartbeat_ack' | 'user_logouted' | 'user_disconnected' | 'incoming_call_sent' | 'incoming_call_received' | 'incoming_call_cancelled' | 'call_accepted' | 'call_completed' | 'participant_joined' | 'participant_left' | 'meeting_ended' | 'user_tokens_updated' | 'chat_message_received';

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
