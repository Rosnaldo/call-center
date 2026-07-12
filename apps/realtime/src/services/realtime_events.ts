import { CallState, IUser, Message } from '@repo/shared-types';
import { getRedisClient } from '../redis/singleton';
import { otherParticipantId } from '#websocket/end_active_call';
import { listOnlineUsers } from './users';
import logger from '#logger';

const CHANNEL_PREFIX = 'realtime-events:';
const ONLINE_USERS_BROADCAST_CHANNEL = 'online-users:broadcast';

// Realtime's own counterpart to IAM's call_events.ts — publishes straight to
// Redis instead of pushing over the websocket, so web reads it via SSE (see
// apps/realtime/src/routes/realtime_events.ts and web's
// init-realtime-events.ts). The websocket carries only heartbeat traffic now.
const publishToUser = (traceId: string, userId: string, event: string, data: unknown): void => {
    logger.info({ traceId, userId, event }, 'realtime event published');
    getRedisClient().publish(`${CHANNEL_PREFIX}${userId}`, JSON.stringify({ event, data }));
};

export function notifyUserLoggedOut(traceId: string, userId: string, user: IUser): void {
    publishToUser(traceId, userId, 'user_logouted', { user });
}

const notifyDisconnectEvent = (traceId: string, event: 'user_disconnecting' | 'user_disconnected', userId: string, call: CallState | null): void => {
    const data = call ? { id: userId, call } : { id: userId };

    publishToUser(traceId, userId, event, data);
    if (call) {
        publishToUser(traceId, otherParticipantId(call, userId), event, data);
    }
};

export function notifyUserDisconnecting(traceId: string, userId: string, call: CallState | null): void {
    notifyDisconnectEvent(traceId, 'user_disconnecting', userId, call);
}

export function notifyUserDisconnected(traceId: string, userId: string, call: CallState | null): void {
    notifyDisconnectEvent(traceId, 'user_disconnected', userId, call);
}

export function notifyUserTokensUpdated(traceId: string, userId: string, tokens?: number): void {
    publishToUser(traceId, userId, 'user_tokens_updated', { id: userId, tokens });
}

export function notifyChatMessageReceived(traceId: string, customerId: string, attendantId: string, message: Message): void {
    publishToUser(traceId, customerId, 'chat_message_received', { message });
    publishToUser(traceId, attendantId, 'chat_message_received', { message });
}

export function notifyMeetingEnded(traceId: string, customerId: string, attendantId: string, call: CallState): void {
    publishToUser(traceId, customerId, 'meeting_ended', { call });
    publishToUser(traceId, attendantId, 'meeting_ended', { call });
}

// request_state's targeted resync (a follower tab asking the leader to
// relay a fresh update_online_users to just itself) — same event name as
// the shared broadcast below, just scoped to one user's own channel instead
// of the shared one, matching the old sendToUser(userId, ...) targeting.
export async function notifyOnlineUsersChangedForUser(traceId: string, userId: string): Promise<void> {
    const users = await listOnlineUsers(traceId);
    publishToUser(traceId, userId, 'update_online_users', { users });
}

// Carries the full online users list now (not just an empty signal) — web
// applies it directly instead of following up with its own
// GET /online-users/list (see web's init-realtime-events.ts).
export async function publishOnlineUsersBroadcast(traceId: string): Promise<void> {
    const users = await listOnlineUsers(traceId);
    logger.info({ traceId }, 'online users broadcast published');
    getRedisClient().publish(ONLINE_USERS_BROADCAST_CHANNEL, JSON.stringify({ event: 'update_online_users', data: { users } }));
}
