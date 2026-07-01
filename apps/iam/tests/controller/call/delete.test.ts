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
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.delete.mapper({ customerId: call.customerId, attendantId: call.attendantId });
        const either = await controller.delete.exec({ mapped });

        expect(isSuccess(either)).toBe(true);

        const stored = await redis.get(key);
        expect(stored).toBeNull();
    });

    it('does not remove other calls', async () => {
        const call1 = buildCallState();
        const call2 = buildCallState();
        const key1 = `calls:${call1.customerId}--${call1.attendantId}`;
        const key2 = `calls:${call2.customerId}--${call2.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key1, JSON.stringify(call1));
        await redis.set(key2, JSON.stringify(call2));

        const controller = new CallController();
        const mapped = controller.delete.mapper({ customerId: call1.customerId, attendantId: call1.attendantId });
        await controller.delete.exec({ mapped });

        const stored = await redis.get(key2);
        expect(stored).not.toBeNull();
    });

    it('succeeds even when call does not exist', async () => {
        const controller = new CallController();
        const mapped = controller.delete.mapper({ customerId: 'nonexistent', attendantId: 'nonexistent' });
        const either = await controller.delete.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });

    it('returns 400 when customerId or attendantId is missing', async () => {
        const controller = new CallController();
        const mapped = controller.delete.mapper({});
        const either = await controller.delete.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const call = buildCallState();
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.delete.mapper({ customerId: call.customerId, attendantId: call.attendantId });
        const either = await controller.delete.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
