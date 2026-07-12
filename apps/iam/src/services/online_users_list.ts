import { IOnlineUser } from '@repo/shared-types';
import { getRedisClient } from '#redis/singleton';

const ONLINE_USERS_PREFIX = 'online_user:';

// Shared by the online-users list controller and call_events.ts's broadcast
// helper — both need the same "everyone currently online" snapshot.
export async function getOnlineUsersList(): Promise<IOnlineUser[]> {
    const redis = getRedisClient();
    const keys = await redis.keys(`${ONLINE_USERS_PREFIX}*`);
    if (keys.length === 0) return [];
    const values = await redis.mget(...keys);
    return values.filter((v): v is string => v !== null).map((v) => JSON.parse(v));
}
