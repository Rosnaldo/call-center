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
// every connected client. Realtime's own /realtime-events/stream SSE route
// subscribes each connected browser directly to this same channel now (see
// apps/realtime/src/routes/realtime_events.ts) — it forwards this channel's
// raw content verbatim, so the payload must be the full {event, data}
// envelope, not just {} (that used to be safe only because the old
// WS-relay subscriber ignored the payload and reconstructed it locally).
const publishOnlineUsersBroadcast = (): void => {
    getRedisClient().publish(ONLINE_USERS_BROADCAST_CHANNEL, JSON.stringify({ event: 'online_users_broadcast', data: {} }));
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

// Phase 1 of the call-domain migration (see plan): replaces realtime's
// sendToUser('user_connected', ...) — sent only to the connecting user,
// never the counterpart, same as before.
export function notifyCallSynced(traceId: string, userId: string, call: CallState | null, shouldJoin: boolean): void {
    publishToUser(traceId, userId, 'call_synced', { call, shouldJoin });
}

export function notifyParticipantAdded(traceId: string, customerId: string, attendantId: string, call: CallState): void {
    publishToUser(traceId, customerId, 'participant_joined', { call });
    publishToUser(traceId, attendantId, 'participant_joined', { call });
}

export function notifyParticipantRemoved(traceId: string, customerId: string, attendantId: string, call: CallState): void {
    publishToUser(traceId, customerId, 'participant_left', { call });
    publishToUser(traceId, attendantId, 'participant_left', { call });
}

export function notifyCallDeleted(traceId: string, customerId: string, attendantId: string): void {
    publishToUser(traceId, customerId, 'call_deleted', {});
    publishToUser(traceId, attendantId, 'call_deleted', {});
}

// Realtime's grace-timer bookkeeping (connection-lifecycle state) decides
// *when* a reconnect happened; this only carries the resulting notification
// to the other participant, mirroring the old sendToUser(otherParticipantId,
// 'partner_reconnected', ...) targeting exactly.
export function notifyPartnerReconnected(traceId: string, targetUserId: string, call: CallState): void {
    publishToUser(traceId, targetUserId, 'partner_reconnected', { call });
}
