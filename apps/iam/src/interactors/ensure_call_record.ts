import { CallState, IOnlineUser } from '@repo/shared-types';
import { getRedisClient } from '#redis/singleton';
import { CallStateBuilder } from '#schemas/call/utils';

const CALLS_KEY = 'calls';

interface Params {
    customerId: string;
    attendantId: string;
    customer: IOnlineUser;
    attendant: IOnlineUser;
    roomName: string;
}

// Idempotent — a call record may already exist for this pair (e.g. a prior
// accept, or self-healed elsewhere); this only creates one if it's
// genuinely missing. Replaces realtime's old ensureCallExists, which took 3
// round-trips back to IAM (get-by-room, 2x find-user-by-slug, create) to do
// the same thing — this runs in-process instead, using data the caller
// (accept.ts) already has on hand from its own getOnlineUserPair call, so
// no extra lookups are needed.
export const ensureCallRecord = async (params: Params): Promise<CallState> => {
    const { customerId, attendantId, customer, attendant, roomName } = params;
    const redis = getRedisClient();

    const existing = await redis.get(`${CALLS_KEY}:${customerId}--${attendantId}`);
    if (existing) return JSON.parse(existing) as CallState;

    return new CallStateBuilder().create({
        id: `${customerId}--${attendantId}`,
        customerId,
        customerName: customer.name,
        attendantId,
        attendantName: attendant.name,
        roomName,
        activeUserIds: [],
        accumulatedMs: 0,
        overlapStartedAt: null,
        startedAt: null,
        endedAt: null,
        tokensToBeCharged: 0,
        isClosed: false,
    }).save();
};
