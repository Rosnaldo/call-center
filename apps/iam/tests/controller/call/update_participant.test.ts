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

describe('Controller > Call > UpdateParticipant', () => {
    it('adds the joining participant to activeUserIds', async () => {
        const call = buildCallState({ activeUserIds: [] });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.updateParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.customerId, joined: true });
        const either = await controller.updateParticipant.exec({ mapped });

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

        const firstJoin = await controller.updateParticipant.exec({
            mapped: controller.updateParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.customerId, joined: true }),
        });
        if (!isSuccess(firstJoin)) throw new Error('Expected success');
        expect(firstJoin.data.isPlaying).toBe(false);

        const secondJoin = await controller.updateParticipant.exec({
            mapped: controller.updateParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.attendantId, joined: true }),
        });
        if (!isSuccess(secondJoin)) throw new Error('Expected success');

        expect(secondJoin.data.activeUserIds.sort()).toEqual([call.attendantId, call.customerId].sort());
        expect(secondJoin.data.isPlaying).toBe(true);
        expect(secondJoin.data.overlapStartedAt).not.toBeNull();
    });

    it('does not lose a concurrent join — both participants joining at the same time still starts the timer', async () => {
        const call = buildCallState({ activeUserIds: [] });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();

        const [customerResult, attendantResult] = await Promise.all([
            controller.updateParticipant.exec({
                mapped: controller.updateParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.customerId, joined: true }),
            }),
            controller.updateParticipant.exec({
                mapped: controller.updateParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: call.attendantId, joined: true }),
            }),
        ]);

        if (!isSuccess(customerResult)) throw new Error('Expected success');
        if (!isSuccess(attendantResult)) throw new Error('Expected success');

        const stored = JSON.parse((await redis.get(key))!);
        expect(stored.activeUserIds.sort()).toEqual([call.attendantId, call.customerId].sort());
        expect(stored.isPlaying).toBe(true);
        expect(stored.overlapStartedAt).not.toBeNull();
    });

    it('finalizes accumulatedMs and stops the timer when a participant leaves while both were present', async () => {
        const overlapStartedAt = Date.now() - 5000;
        const call = buildCallState({
            activeUserIds: ['customer-1', 'attendant-1'],
            customerId: 'customer-1',
            attendantId: 'attendant-1',
            overlapStartedAt,
            isPlaying: true,
        });
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(call));

        const controller = new CallController();
        const mapped = controller.updateParticipant.mapper({ customerId: call.customerId, attendantId: call.attendantId, userId: 'customer-1', joined: false });
        const either = await controller.updateParticipant.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);
        expect(either.data.activeUserIds).toEqual(['attendant-1']);
        expect(either.data.isPlaying).toBe(false);
        expect(either.data.overlapStartedAt).toBeNull();
        expect(either.data.accumulatedMs).toBeGreaterThanOrEqual(5000);
    });

    it('returns 400 when call does not exist', async () => {
        const controller = new CallController();
        const mapped = controller.updateParticipant.mapper({ customerId: 'nonexistent', attendantId: 'nonexistent', userId: 'someone', joined: true });
        const either = await controller.updateParticipant.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId, attendantId or userId is missing', async () => {
        const controller = new CallController();
        const mapped = controller.updateParticipant.mapper({ customerId: 'a', attendantId: 'b' });
        const either = await controller.updateParticipant.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
