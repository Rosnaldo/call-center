import { CallState } from '@repo/shared-types';
import { getRedisClient } from '../redis/singleton';
import logger from '#logger';

const CHANNEL_PREFIX = 'call-events:';

// Realtime's counterpart to IAM's services/call_events.ts, for the one
// event realtime itself now originates on this channel: deleteCall used to
// have IAM's /calls/delete route publish update_call after the write —
// since that write moved here (see calls_redis.ts), the publish comes along
// with it. IAM keeps publishing everything it still owns (add-participant,
// remove-participant, complete, sync-active-call, incoming-call) exactly as
// before; both sides write to the same channel, same as
// online-users:broadcast already does.
export function notifyCallUpdate(traceId: string, userIds: string[], call: CallState | null): void {
    userIds.forEach((userId) => {
        logger.info({ traceId, userId, event: 'update_call' }, 'call event published');
        getRedisClient().publish(`${CHANNEL_PREFIX}${userId}`, JSON.stringify({ event: 'update_call', data: { call } }));
    });
}
