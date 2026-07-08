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

describe('Controller > Call > AddParticipant', () => {
    it('adds the joining participant to activeUserIds', async () => {
        const call = buildCallState({ activeUserIds: [] });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.addParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.customerId });
        const either = await controller.addParticipant.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);
        expect(either.data.activeUserIds).toEqual([call.customerId]);
        expect(either.data.isPlaying).toBe(false);
        expect(either.data.overlapStartedAt).toBeNull();
    });

    it('starts the timer once both participants have joined', async () => {
        const call = buildCallState({ activeUserIds: [] });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();

        const firstJoin = await controller.addParticipant.exec({
            mapped: controller.addParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.customerId }),
        });
        if (!isSuccess(firstJoin)) throw new Error('Expected success');
        expect(firstJoin.data.isPlaying).toBe(false);

        const secondJoin = await controller.addParticipant.exec({
            mapped: controller.addParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.attendantId }),
        });
        if (!isSuccess(secondJoin)) throw new Error('Expected success');

        expect(secondJoin.data.activeUserIds.sort()).toEqual([call.attendantId, call.customerId].sort());
        expect(secondJoin.data.isPlaying).toBe(true);
        expect(secondJoin.data.overlapStartedAt).not.toBeNull();
    });

    it('does not lose a concurrent add — both participants joining at the same time still starts the timer', async () => {
        const call = buildCallState({ activeUserIds: [] });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();

        const [customerResult, attendantResult] = await Promise.all([
            controller.addParticipant.exec({
                mapped: controller.addParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.customerId }),
            }),
            controller.addParticipant.exec({
                mapped: controller.addParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.attendantId }),
            }),
        ]);

        if (!isSuccess(customerResult)) throw new Error('Expected success');
        if (!isSuccess(attendantResult)) throw new Error('Expected success');

        const stored = JSON.parse((await redis.get(key))!);
        expect(stored.activeUserIds.sort()).toEqual([call.attendantId, call.customerId].sort());
        expect(stored.isPlaying).toBe(true);
        expect(stored.overlapStartedAt).not.toBeNull();
    });

    it('returns 400 when call does not exist', async () => {
        const controller = new CallController();
        const mapped = controller.addParticipant.mapper({ customerId: 'nonexistent', attendantId: 'nonexistent', userId: 'someone' });
        const either = await controller.addParticipant.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId, attendantId or userId is missing', async () => {
        const controller = new CallController();
        const mapped = controller.addParticipant.mapper({ customerId: 'a', attendantId: 'b' });
        const either = await controller.addParticipant.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
