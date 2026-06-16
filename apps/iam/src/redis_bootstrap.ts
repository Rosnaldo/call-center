import { connectRedis } from '#redis/singleton';

export const redisBootstrap = async (): Promise<void> => {
    await connectRedis();
};
