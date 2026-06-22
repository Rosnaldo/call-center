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
        const redis = getRedisClient();
        await redis.hset('calls', call.id, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.update.mapper({ id: call.id, updates: { customerInCall: true } });
        const either = await controller.update.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data.id).toBe(call.id);
        expect(either.data.customerInCall).toBe(true);
        expect(either.data.attendantInCall).toBe(call.attendantInCall);
    });

    it('persists the update in redis', async () => {
        const call = buildCallState();
        const redis = getRedisClient();
        await redis.hset('calls', call.id, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.update.mapper({ id: call.id, updates: { wasAccepted: true } });
        await controller.update.exec({ mapped });

        const stored = JSON.parse((await redis.hget('calls', call.id))!);
        expect(stored.wasAccepted).toBe(true);
    });

    it('preserves fields not included in the update', async () => {
        const call = buildCallState({ customerName: 'Original' });
        const redis = getRedisClient();
        await redis.hset('calls', call.id, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.update.mapper({ id: call.id, updates: { attendantInCall: true } });
        const either = await controller.update.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Expected success');

        expect(either.data.customerName).toBe('Original');
        expect(either.data.customerId).toBe(call.customerId);
        expect(either.data.roomName).toBe(call.roomName);
    });

    it('returns 400 when call does not exist', async () => {
        const controller = new CallController();
        const mapped = controller.update.mapper({ id: 'nonexistent', updates: { wasAccepted: true } });
        const either = await controller.update.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when id is missing', async () => {
        const controller = new CallController();
        const mapped = controller.update.mapper({ updates: { wasAccepted: true } });
        const either = await controller.update.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const call = buildCallState();
        const redis = getRedisClient();
        await redis.hset('calls', call.id, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.update.mapper({ id: call.id, updates: {} });
        const either = await controller.update.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
