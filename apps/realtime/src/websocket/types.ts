import { IncomingCallState, IUser } from '@repo/shared-types';
import { EventEmitterTransport } from '#websocket/transport';

export interface AuthenticatedWebSocket extends EventEmitterTransport {
    user: IUser;
    token: string;
    traceId: string;
    isAlive: boolean;
}

// Everything that used to flow over the websocket beyond heartbeat now goes
// through IAM's /call-events/stream or realtime's own /realtime-events/stream
// SSE routes instead — heartbeat_ack is the only server push left on the
// socket itself.
export type WsEvent = 'heartbeat_ack';

export type WsClientEvent = 'heartbeat' | 'user_logout' | 'incoming_call_sent' | 'incoming_call_cancelled' | 'request_state';

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
    | { event: 'incoming_call_cancelled'; data: CancelledCallData }
    | { event: 'request_state' };

export interface WsMessage<T = unknown> {
    event: WsEvent;
    data: T;
}
