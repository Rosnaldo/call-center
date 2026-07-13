import { CallState, MAX_CALL_DURATION_SECONDS } from '@repo/shared-types';
import { getRedisClient } from '../../../iam/src/redis/singleton';

const CALLS_KEY = 'calls';
const ROOMS_KEY = 'daily_rooms';

// Replaces the deleted /calls/create, /calls/get-by-room, /calls/update and
// /calls/track-room HTTP routes in tests — both iam (business-logic writes)
// and realtime (see realtime/src/services/calls_redis.ts) now read/write
// calls:<customerId>--<attendantId> and daily_rooms directly against Redis,
// so tests do the same instead of going through an HTTP surface that no
// longer exists.

export async function createCallInRedis(call: CallState): Promise<CallState> {
    const key = `${CALLS_KEY}:${call.customerId}--${call.attendantId}`;
    await getRedisClient().set(key, JSON.stringify(call), 'EX', MAX_CALL_DURATION_SECONDS);
    return call;
}

export async function getCallByRoomFromRedis(roomName: string): Promise<CallState | null> {
    const redis = getRedisClient();
    const keys = await redis.keys(`${CALLS_KEY}:*`);
    if (keys.length === 0) return null;
    const values = await redis.mget(keys);
    return values
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v) as CallState)
        .find((c) => c.roomName === roomName) ?? null;
}

export type CallUpdatePatch = Partial<Pick<
    CallState,
    'activeUserIds' | 'accumulatedMs' | 'overlapStartedAt' | 'startedAt' | 'endedAt' | 'tokensToBeCharged'
>>;

export async function updateCallInRedis(customerId: string, attendantId: string, updates: CallUpdatePatch): Promise<CallState | null> {
    const redis = getRedisClient();
    const key = `${CALLS_KEY}:${customerId}--${attendantId}`;
    const existing = await redis.get(key);
    if (!existing) return null;

    const call = { ...(JSON.parse(existing) as CallState), ...updates };
    await redis.set(key, JSON.stringify(call), 'EX', MAX_CALL_DURATION_SECONDS);
    return call;
}

export async function trackRoomInRedis(roomName: string): Promise<void> {
    await getRedisClient().sadd(ROOMS_KEY, roomName);
}
