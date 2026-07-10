import Redis from 'ioredis';
import _ from 'lodash';
// Relative import, not '#properties' — see the comment in ../apis/iam.ts for
// why this needs to resolve to *realtime's* Properties, not IAM's, under the
// integration test suite's merged Jest moduleNameMapper.
import properties from '../properties';

export class RedisConnection {
    public client: Redis | undefined;

    public readonly get = (): Redis => {
        if (_.isNil(this.client)) throw new Error('Redis client não encontrado');
        return this.client;
    };

    public readonly connect = async (): Promise<Redis> => {
        if (!_.isNil(this.client)) return this.client;
        this.client = await this.createClient();
        return this.client;
    };

    private readonly createClient = async (): Promise<Redis> => {
        if (properties.nodeEnv === 'test') {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const RedisMock = require('ioredis-mock');
            return new RedisMock() as Redis;
        }
        return new Redis(properties.redisUri);
    };

    public readonly disconnect = async (): Promise<void> => {
        if (!_.isNil(this.client)) {
            await this.client.quit();
            this.client = undefined;
        }
    };
}
