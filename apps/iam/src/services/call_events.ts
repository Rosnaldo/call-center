import { CallState, IncomingCallState } from '@repo/shared-types';
import { getRedisClient } from '#redis/singleton';
import { getOnlineUsersList } from 'src/services/online_users_list';
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
// raw content verbatim, carrying the full online users list so the client
// applies it directly instead of following up with its own GET /online-users/list.
const publishOnlineUsersBroadcast = async (traceId: string): Promise<void> => {
    const users = await getOnlineUsersList();
    logger.info({ traceId }, 'online users broadcast published');
    getRedisClient().publish(ONLINE_USERS_BROADCAST_CHANNEL, JSON.stringify({ event: 'update_online_users', data: { users } }));
};

const broadcastOnlineUsers = (traceId: string): void => {
    publishOnlineUsersBroadcast(traceId).catch((error: unknown) => {
        logger.error({ traceId, error }, 'failed to publish online users broadcast');
    });
};

// The single source of truth for call state on the wire — published
// alongside every call mutation (accept, complete, sync, participant
// add/remove, delete, partner reconnect). Every other call-domain event only
// carries its own extra side effect (Daily join, modal, ringtone) and leaves
// the actual state assignment to this.
export function notifyCallUpdate(traceId: string, userIds: string[], call: CallState | null): void {
    userIds.forEach((userId) => publishToUser(traceId, userId, 'update_call', { call }));
}

// The single source of truth for incoming-call state on the wire —
// published alongside send/cancel/accept.
export function notifyIncomingCallUpdate(traceId: string, userIds: string[], incomingCall: IncomingCallState | null): void {
    userIds.forEach((userId) => publishToUser(traceId, userId, 'update_incomingcall', { incomingCall }));
}

export function notifyIncomingCallSent(traceId: string, customerId: string, attendantId: string, calledBy: string): void {
    const incomingCall: IncomingCallState = { customerId, attendantId, calledBy: calledBy as IncomingCallState['calledBy'] };
    const callerId = calledBy === 'customer' ? customerId : attendantId;
    const receiverId = calledBy === 'customer' ? attendantId : customerId;

    // Only the receiver needs a distinct signal (it triggers the ringtone) —
    // the caller's own UI reacts purely to incomingCall state, carried by
    // notifyIncomingCallUpdate below.
    publishToUser(traceId, receiverId, 'incoming_call_received', {});
    notifyIncomingCallUpdate(traceId, [callerId, receiverId], incomingCall);
    broadcastOnlineUsers(traceId);
}

export function notifyIncomingCallCancelled(traceId: string, customerId: string, attendantId: string): void {
    publishToUser(traceId, customerId, 'incoming_call_cancelled', {});
    publishToUser(traceId, attendantId, 'incoming_call_cancelled', {});
    notifyIncomingCallUpdate(traceId, [customerId, attendantId], null);
    broadcastOnlineUsers(traceId);
}

// call_accepted still carries the full CallState — the web side effect
// (joining the Daily room) needs roomName directly, not just a state-changed
// signal.
export function notifyCallAccepted(traceId: string, customerId: string, attendantId: string, call: CallState): void {
    publishToUser(traceId, customerId, 'call_accepted', { call });
    publishToUser(traceId, attendantId, 'call_accepted', { call });
    notifyCallUpdate(traceId, [customerId, attendantId], call);
    // Accepting ends the incoming-call phase for both parties.
    notifyIncomingCallUpdate(traceId, [customerId, attendantId], null);
    broadcastOnlineUsers(traceId);
}

export function notifyCallCompleted(traceId: string, customerId: string, attendantId: string, call: CallState): void {
    publishToUser(traceId, customerId, 'call_completed', {});
    publishToUser(traceId, attendantId, 'call_completed', {});
    notifyCallUpdate(traceId, [customerId, attendantId], call);
    broadcastOnlineUsers(traceId);
}

// Phase 1 of the call-domain migration (see plan): replaces realtime's
// sendToUser('user_connected', ...) — sent only to the connecting user,
// never the counterpart, same as before. call_synced keeps its own payload
// (call + shouldJoin) since the web side effect (Daily join gating, or a
// full resetCallState() when call is null) needs both.
export function notifyCallSynced(traceId: string, userId: string, call: CallState | null, shouldJoin: boolean): void {
    publishToUser(traceId, userId, 'call_synced', { call, shouldJoin });
    notifyCallUpdate(traceId, [userId], call);
}
