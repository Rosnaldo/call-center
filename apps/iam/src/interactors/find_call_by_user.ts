import { getRedisClient } from '#redis/singleton';
import { CallState } from '@repo/shared-types';

const CALLS_KEY = 'calls';

export const findCallByUser = async (userId: string): Promise<CallState | null> => {
    const redis = getRedisClient();
    const keys = await redis.keys(`${CALLS_KEY}:*`);
    if (keys.length === 0) return null;

    const values = await redis.mget(keys);
    return values
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v) as CallState)
        .find((c) => c.customerId === userId || c.attendantId === userId) ?? null;
};
