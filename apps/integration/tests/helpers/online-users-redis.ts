import { IOnlineUser } from '@repo/shared-types';
import { getRedisClient } from '../../../iam/src/redis/singleton';

const ONLINE_USERS_PREFIX = 'online_user:';
const TTL_SECONDS = 90;

// Replaces the deleted /online-users/list and /online-users/add HTTP routes
// in tests — both iam and realtime now read/write online_user:<id> directly
// against Redis (see iam/src/interactors/online_user.ts and
// realtime/src/services/online_users_redis.ts), so tests do the same instead
// of going through an HTTP surface that no longer exists.

export async function listOnlineUsersFromRedis(): Promise<IOnlineUser[]> {
    const redis = getRedisClient();
    const keys = await redis.keys(`${ONLINE_USERS_PREFIX}*`);
    if (keys.length === 0) return [];
    const values = await redis.mget(...keys);
    return values.filter((v): v is string => v !== null).map((v) => JSON.parse(v));
}

// Mirrors the old Add controller's preservation of an existing 'in-call'
// status across a re-add.
export async function addOnlineUserToRedis(user: IOnlineUser): Promise<void> {
    const redis = getRedisClient();
    const existingRaw = await redis.get(`${ONLINE_USERS_PREFIX}${user.id}`);
    const existing = existingRaw ? (JSON.parse(existingRaw) as IOnlineUser) : null;
    const toStore: IOnlineUser = { ...user, status: existing?.status === 'in-call' ? existing.status : user.status };
    await redis.set(`${ONLINE_USERS_PREFIX}${user.id}`, JSON.stringify(toStore), 'EX', TTL_SECONDS);
}
