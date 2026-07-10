import type Redis from 'ioredis';
import { RedisConnection } from './main';

const main = new RedisConnection();

export const connectRedis = async (): Promise<void> => {
    await main.connect();
};

export const getRedisClient = (): Redis => {
    return main.get();
};

export const disconnectRedis = async (): Promise<void> => {
    await main.disconnect();
};
