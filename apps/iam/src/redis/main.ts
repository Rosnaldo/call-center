import Redis from 'ioredis';
import Properties from '#properties';

export class RedisMain {
    private client: Redis;

    constructor() {
        this.client = new Redis(Properties.redisUri);
    }

    get(): Redis {
        return this.client;
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
    }
}
