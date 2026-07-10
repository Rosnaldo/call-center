import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { CallController } from 'src/controllers/call';
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

describe('Controller > Call > GetCallByUser', () => {
    it('finds the call when the userId matches the customer', async () => {
        const call = buildCallState();
        await getRedisClient().set(`calls:${call.customerId}--${call.attendantId}`, JSON.stringify(call));

        const controller = new CallController();
        const either = await controller.getByUser.exec({ userId: call.customerId });

        if (either.isError) throw new Error('Expected success');
        expect(either.data.id).toBe(call.id);
    });

    it('finds the call when the userId matches the attendant', async () => {
        const call = buildCallState();
        await getRedisClient().set(`calls:${call.customerId}--${call.attendantId}`, JSON.stringify(call));

        const controller = new CallController();
        const either = await controller.getByUser.exec({ userId: call.attendantId });

        if (either.isError) throw new Error('Expected success');
        expect(either.data.id).toBe(call.id);
    });

    it('returns 400 when the user has no active call', async () => {
        const call = buildCallState();
        await getRedisClient().set(`calls:${call.customerId}--${call.attendantId}`, JSON.stringify(call));

        const controller = new CallController();
        const either = await controller.getByUser.exec({ userId: 'someone-else' });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when userId is missing', async () => {
        const controller = new CallController();
        const either = await controller.getByUser.exec({ userId: '' });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
