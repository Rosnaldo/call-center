import { IOnlineUser } from '@repo/shared-types';
import { getRedisClient } from '../redis/singleton';

const ONLINE_USERS_PREFIX = 'online_user:';
const TTL_SECONDS = 90;

// Realtime's counterpart to IAM's interactors/online_user.ts +
// services/online_users_list.ts — same Redis keyspace (online_user:<id>,
// TTL 90s), read/written directly instead of over HTTP. Presence lifecycle
// (connect/disconnect/heartbeat) originates here, in realtime; call-domain
// status/token writes originate in IAM and stay there. Neither service asks
// the other over HTTP to touch this keyspace anymore.

export const getOnlineUser = async (userId: string): Promise<IOnlineUser | null> => {
    const raw = await getRedisClient().get(`${ONLINE_USERS_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as IOnlineUser) : null;
};

export const setOnlineUser = async (user: IOnlineUser, patch: Partial<IOnlineUser>): Promise<void> => {
    await getRedisClient().set(`${ONLINE_USERS_PREFIX}${user.id}`, JSON.stringify({ ...user, ...patch }), 'EX', TTL_SECONDS);
};

export const patchOnlineUserIfPresent = async (userId: string, patch: Partial<IOnlineUser>): Promise<void> => {
    const user = await getOnlineUser(userId);
    if (!user) return;
    await setOnlineUser(user, patch);
};

// Mirrors IAM's Add controller — preserves an existing 'in-call' status
// across a reconnect/heartbeat re-add instead of clobbering it back to
// whatever status the caller snapshotted at connect time.
export const addOnlineUser = async (user: IOnlineUser): Promise<void> => {
    const existing = await getOnlineUser(user.id);
    const toStore: IOnlineUser = { ...user, status: existing?.status === 'in-call' ? existing.status : user.status };
    await getRedisClient().set(`${ONLINE_USERS_PREFIX}${user.id}`, JSON.stringify(toStore), 'EX', TTL_SECONDS);
};

export const removeOnlineUser = async (userId: string): Promise<void> => {
    await getRedisClient().del(`${ONLINE_USERS_PREFIX}${userId}`);
};

// Refreshes presence TTL only, returns whether a key existed to refresh —
// callers fall back to addOnlineUser (a full re-seed) when it doesn't.
export const touchOnlineUserPresence = async (userId: string): Promise<boolean> => {
    const touched = await getRedisClient().expire(`${ONLINE_USERS_PREFIX}${userId}`, TTL_SECONDS);
    return touched === 1;
};

export const getOnlineUsersList = async (): Promise<IOnlineUser[]> => {
    const redis = getRedisClient();
    const keys = await redis.keys(`${ONLINE_USERS_PREFIX}*`);
    if (keys.length === 0) return [];
    const values = await redis.mget(...keys);
    return values.filter((v): v is string => v !== null).map((v) => JSON.parse(v));
};
