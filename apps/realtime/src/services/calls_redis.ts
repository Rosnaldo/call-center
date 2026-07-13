import { CallState, MAX_CALL_DURATION_SECONDS } from '@repo/shared-types';
import { getRedisClient } from '../redis/singleton';

const CALLS_KEY = 'calls';
const ROOMS_KEY = 'daily_rooms';

// Realtime's counterpart to IAM's interactors/find_call_by_user.ts +
// the now-removed get/get-by-room/create/update/delete/track-room
// controllers — same Redis keyspace, read/written directly instead of over
// HTTP. These ops have no computed/business fields (that stays in IAM, see
// add-participant/remove-participant/complete), so duplicating them here is
// a plain, low-risk mirror.

export const getCallByUser = async (userId: string): Promise<CallState | null> => {
    const redis = getRedisClient();
    const keys = await redis.keys(`${CALLS_KEY}:*`);
    if (keys.length === 0) return null;
    const values = await redis.mget(keys);
    return values
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v) as CallState)
        .find((c) => c.customerId === userId || c.attendantId === userId) ?? null;
};

export const getCallByRoom = async (roomName: string): Promise<CallState | null> => {
    const redis = getRedisClient();
    const keys = await redis.keys(`${CALLS_KEY}:*`);
    if (keys.length === 0) return null;
    const values = await redis.mget(keys);
    return values
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v) as CallState)
        .find((c) => c.roomName === roomName) ?? null;
};

export const createCall = async (call: CallState): Promise<CallState> => {
    const redis = getRedisClient();
    const key = `${CALLS_KEY}:${call.customerId}--${call.attendantId}`;
    await redis.set(key, JSON.stringify(call), 'EX', MAX_CALL_DURATION_SECONDS);
    return call;
};

export type CallUpdatePatch = Partial<Pick<
    CallState,
    'activeUserIds' | 'accumulatedMs' | 'overlapStartedAt' | 'startedAt' | 'endedAt' | 'tokensToBeCharged'
>>;

// Per-field undefined checks (not a blind spread) — matches
// CallStateBuilder.update()'s semantics exactly: a field absent from
// `updates` keeps its existing value, same as IAM's version.
export const updateCall = async (customerId: string, attendantId: string, updates: CallUpdatePatch): Promise<CallState | null> => {
    const redis = getRedisClient();
    const key = `${CALLS_KEY}:${customerId}--${attendantId}`;
    const existing = await redis.get(key);
    if (!existing) return null;

    const call = JSON.parse(existing) as CallState;
    const { activeUserIds, accumulatedMs, overlapStartedAt, startedAt, endedAt, tokensToBeCharged } = updates;
    if (activeUserIds !== undefined) call.activeUserIds = activeUserIds;
    if (accumulatedMs !== undefined) call.accumulatedMs = accumulatedMs;
    if (overlapStartedAt !== undefined) call.overlapStartedAt = overlapStartedAt;
    if (startedAt !== undefined) call.startedAt = startedAt;
    if (endedAt !== undefined) call.endedAt = endedAt;
    if (tokensToBeCharged !== undefined) call.tokensToBeCharged = tokensToBeCharged;

    await redis.set(key, JSON.stringify(call), 'EX', MAX_CALL_DURATION_SECONDS);
    return call;
};

export const deleteCall = async (customerId: string, attendantId: string): Promise<void> => {
    await getRedisClient().del(`${CALLS_KEY}:${customerId}--${attendantId}`);
};

export const trackRoom = async (roomName: string): Promise<void> => {
    await getRedisClient().sadd(ROOMS_KEY, roomName);
};

export const listAndClearTrackedRooms = async (): Promise<string[]> => {
    const redis = getRedisClient();
    const rooms = await redis.smembers(ROOMS_KEY);
    if (rooms.length) await redis.del(ROOMS_KEY);
    return rooms;
};
