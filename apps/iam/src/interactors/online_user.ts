import { getRedisClient } from '#redis/singleton';
import { BadRequestException } from '#exceptions/bad_request';
import { IOnlineUser } from '@repo/shared-types';

const ONLINE_USERS_PREFIX = 'online_user:';
const TTL_SECONDS = 90;

export const getOnlineUser = async (userId: string): Promise<IOnlineUser | null> => {
    const redis = getRedisClient();
    const raw = await redis.get(`${ONLINE_USERS_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as IOnlineUser) : null;
};

export const getOnlineUserPair = async (
    customerId: string,
    attendantId: string,
): Promise<{ customer: IOnlineUser; attendant: IOnlineUser }> => {
    const [customer, attendant] = await Promise.all([getOnlineUser(customerId), getOnlineUser(attendantId)]);
    if (!customer) throw new BadRequestException('Cliente não encontrado.');
    if (!attendant) throw new BadRequestException('Atendente não encontrado.');
    return { customer, attendant };
};

export const setOnlineUser = async (user: IOnlineUser, patch: Partial<IOnlineUser>): Promise<void> => {
    const redis = getRedisClient();
    await redis.set(`${ONLINE_USERS_PREFIX}${user.id}`, JSON.stringify({ ...user, ...patch }), 'EX', TTL_SECONDS);
};

export const patchOnlineUserIfPresent = async (userId: string, patch: Partial<IOnlineUser>): Promise<void> => {
    const user = await getOnlineUser(userId);
    if (!user) throw new BadRequestException('Usuário não encontrado.');
    await setOnlineUser(user, patch);
};
