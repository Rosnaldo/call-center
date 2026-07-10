import { CallState, IncomingCallState } from '@repo/shared-types';
import { getRedisClient } from '#redis/singleton';
import logger from '#logger';

const CHANNEL_PREFIX = 'call-events:';
const ONLINE_USERS_BROADCAST_CHANNEL = 'online-users:broadcast';

// Local Redis publish instead of an HTTP webhook round-trip to realtime —
// web subscribes directly (see /call-events/stream), so there's no other
// service left to notify for this flow.
const publishToUser = (traceId: string, userId: string, event: string, data: unknown): void => {
    logger.info({ traceId, userId, event }, 'call event published');
    getRedisClient().publish(`${CHANNEL_PREFIX}${userId}`, JSON.stringify({ event, data }));
};

// send/cancel/accept/complete each flip a user's online status (occupied/
// idle/in-call) — that's relevant beyond just the customer/attendant pair
// (e.g. another customer's attendant list), so it still needs a broadcast to
// every connected client. realtime subscribes to this channel and relays it
// over the websocket (see realtime's redis/online_users_broadcast.ts) —
// that's the one piece of this flow still touching realtime, since a Redis
// message can't reach a browser without something to fan it out over the
// websocket to clients that aren't part of this specific call.
const publishOnlineUsersBroadcast = (): void => {
    getRedisClient().publish(ONLINE_USERS_BROADCAST_CHANNEL, JSON.stringify({}));
};

export function notifyIncomingCallSent(traceId: string, customerId: string, attendantId: string, calledBy: string): void {
    const incomingCall: IncomingCallState = { customerId, attendantId, calledBy: calledBy as IncomingCallState['calledBy'] };
    const callerId = calledBy === 'customer' ? customerId : attendantId;
    const receiverId = calledBy === 'customer' ? attendantId : customerId;

    publishToUser(traceId, callerId, 'incoming_call_sent', { incomingCall });
    publishToUser(traceId, receiverId, 'incoming_call_received', { incomingCall });
    publishOnlineUsersBroadcast();
}

export function notifyIncomingCallCancelled(traceId: string, customerId: string, attendantId: string): void {
    publishToUser(traceId, customerId, 'incoming_call_cancelled', {});
    publishToUser(traceId, attendantId, 'incoming_call_cancelled', {});
    publishOnlineUsersBroadcast();
}

// Carries the full CallState now (not just the IncomingCallState) — the
// client applies it directly instead of following up with its own
// GET /calls/get (see web's incomingCallAccepted action).
export function notifyCallAccepted(traceId: string, customerId: string, attendantId: string, call: CallState): void {
    publishToUser(traceId, customerId, 'call_accepted', { call });
    publishToUser(traceId, attendantId, 'call_accepted', { call });
    publishOnlineUsersBroadcast();
}

export function notifyCallCompleted(traceId: string, customerId: string, attendantId: string, call: CallState): void {
    publishToUser(traceId, customerId, 'call_completed', { call });
    publishToUser(traceId, attendantId, 'call_completed', { call });
    publishOnlineUsersBroadcast();
}
