import { RedisMain } from './main';
import type Redis from 'ioredis';

let redisMain: RedisMain;

export const buildRedisMain = (): RedisMain => {
    redisMain = new RedisMain();
    return redisMain;
};

export const getRedisClient = (): Redis => {
    return redisMain.get();
};

export const disconnectRedis = async (): Promise<void> => {
    await redisMain.disconnect();
};
