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

describe('Controller > Call > RemoveParticipant', () => {
    it('finalizes accumulatedMs and stops the timer when a participant leaves while both were present', async () => {
        const overlapStartedAt = Date.now() - 5000;
        const call = buildCallState({
            activeUserIds: ['customer-1', 'attendant-1'],
            customerId: 'customer-1',
            attendantId: 'attendant-1',
            overlapStartedAt,
        });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.removeParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: 'customer-1' });
        const either = await controller.removeParticipant.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);
        expect(either.data.activeUserIds).toEqual(['attendant-1']);
        expect(either.data.overlapStartedAt).toBeNull();
        expect(either.data.accumulatedMs).toBeGreaterThanOrEqual(5000);
    });

    it('removes the leaving participant from activeUserIds without touching the timer when only one was present', async () => {
        const call = buildCallState({ activeUserIds: ['customer-1'], customerId: 'customer-1', attendantId: 'attendant-1' });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.removeParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: 'customer-1' });
        const either = await controller.removeParticipant.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);
        expect(either.data.activeUserIds).toEqual([]);
        expect(either.data.overlapStartedAt).toBeNull();
    });

    it('returns 400 when call does not exist', async () => {
        const controller = new CallController();
        const mapped = controller.removeParticipant.mapper({ customerId: 'nonexistent', attendantId: 'nonexistent', userId: 'someone' });
        const either = await controller.removeParticipant.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId, attendantId or userId is missing', async () => {
        const controller = new CallController();
        const mapped = controller.removeParticipant.mapper({ customerId: 'a', attendantId: 'b' });
        const either = await controller.removeParticipant.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
