import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { CallController } from 'src/controllers/call';
import { isSuccess } from 'src/utils/either';
import { buildCallState } from '../../builders';

beforeAll(async () => {
    await connectRedis();
});

afterAll(async () => {
    await disconnectRedis();
});

beforeEach(async () => {
    await getRedisClient().flushall();
});

describe('Controller > Call > Delete', () => {
    it('removes the call from redis', async () => {
        const call = buildCallState();
        const redis = getRedisClient();
        await redis.hset('calls', call.id, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.delete.mapper({ id: call.id });
        const either = await controller.delete.exec({ mapped });

        expect(isSuccess(either)).toBe(true);

        const stored = await redis.hget('calls', call.id);
        expect(stored).toBeNull();
    });

    it('does not remove other calls', async () => {
        const call1 = buildCallState();
        const call2 = buildCallState();
        const redis = getRedisClient();
        await redis.hset('calls', call1.id, JSON.stringify(call1));
        await redis.hset('calls', call2.id, JSON.stringify(call2));

        const controller = new CallController();
        const mapped = controller.delete.mapper({ id: call1.id });
        await controller.delete.exec({ mapped });

        const stored = await redis.hget('calls', call2.id);
        expect(stored).not.toBeNull();
    });

    it('succeeds even when call does not exist', async () => {
        const controller = new CallController();
        const mapped = controller.delete.mapper({ id: 'nonexistent' });
        const either = await controller.delete.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });

    it('returns 400 when id is missing', async () => {
        const controller = new CallController();
        const mapped = controller.delete.mapper({});
        const either = await controller.delete.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const call = buildCallState();
        const redis = getRedisClient();
        await redis.hset('calls', call.id, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.delete.mapper({ id: call.id });
        const either = await controller.delete.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
