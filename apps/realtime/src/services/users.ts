import { IOnlineUser, IUser } from "@repo/shared-types";
import { createIamClient } from "src/apis/iam";
import * as onlineUsersRedis from './online_users_redis';

export const userExists = async (traceId: string, email: string, token: string): Promise<IUser> => {
    const { data } = await createIamClient(traceId).get<IUser>('/users/exists', {
        headers: { Authorization: token },
        params: { email },
    });
    return data;
};

export const addToIam = async (user: IOnlineUser): Promise<void> => {
    await onlineUsersRedis.addOnlineUser(user);
};

export const removeFromIam = async (userId: string): Promise<void> => {
    await onlineUsersRedis.removeOnlineUser(userId);
};

// Refreshes presence TTL without touching status/tokens — returns whether a
// record existed to refresh. Callers should fall back to addToIam (a full
// re-seed) when it doesn't.
export const touchOnlineUser = async (userId: string): Promise<boolean> => {
    return onlineUsersRedis.touchOnlineUserPresence(userId);
};

export const findUserBySlug = async (traceId: string, slug: string): Promise<IUser> => {
    const { data } = await createIamClient(traceId).get<IUser>('/users/find-by-slug', { params: { slug } });
    return data;
};

export const updateOnlineUserStatus = async (_traceId: string, userId: string, status: IOnlineUser['status']): Promise<void> => {
    await onlineUsersRedis.patchOnlineUserIfPresent(userId, { status });
};
