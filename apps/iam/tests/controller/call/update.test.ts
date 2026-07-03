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

describe('Controller > Call > Update', () => {
    it('updates the call and returns it', async () => {
        const call = buildCallState();
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.update.mapper({ customerId: call.customerId, attendantId: call.attendantId, updates: { overlapStartedAt: 123 } });
        const either = await controller.update.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data.overlapStartedAt).toBe(123);
        expect(either.data.accumulatedMs).toBe(call.accumulatedMs);
    });

    it('persists the update in redis', async () => {
        const call = buildCallState();
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.update.mapper({ customerId: call.customerId, attendantId: call.attendantId, updates: { accumulatedMs: 5000 } });
        await controller.update.exec({ mapped });

        const stored = JSON.parse((await redis.get(key))!);
        expect(stored.accumulatedMs).toBe(5000);
    });

    it('preserves fields not included in the update', async () => {
        const call = buildCallState({ customerName: 'Original' });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.update.mapper({ customerId: call.customerId, attendantId: call.attendantId, updates: { accumulatedMs: 5000 } });
        const either = await controller.update.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Expected success');

        expect(either.data.customerName).toBe('Original');
        expect(either.data.customerId).toBe(call.customerId);
        expect(either.data.roomName).toBe(call.roomName);
    });

    it('returns 400 when call does not exist', async () => {
        const controller = new CallController();
        const mapped = controller.update.mapper({ customerId: 'nonexistent', attendantId: 'nonexistent', updates: { accumulatedMs: 5000 } });
        const either = await controller.update.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId or attendantId is missing', async () => {
        const controller = new CallController();
        const mapped = controller.update.mapper({ updates: { accumulatedMs: 5000 } });
        const either = await controller.update.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const call = buildCallState();
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.update.mapper({ customerId: call.customerId, attendantId: call.attendantId, updates: {} });
        const either = await controller.update.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
