import { getRedisClient } from '#redis/singleton';

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
}

export async function cacheSet(key: string, value: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
}
