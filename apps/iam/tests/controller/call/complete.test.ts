import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { CallController } from 'src/controllers/call';
import { buildOnlineUser, buildCallState } from '../../builders';

jest.mock('src/services/realtime', () => ({
    notifyCallCompleted: jest.fn().mockResolvedValue(undefined),
}));

beforeAll(async () => {
    await connectRedis();
});

afterAll(async () => {
    await disconnectRedis();
});

beforeEach(async () => {
    await getRedisClient().flushall();
    jest.clearAllMocks();
});

const TRACE = 'test-trace';

const seedUsers = async (customer: ReturnType<typeof buildOnlineUser>, attendant: ReturnType<typeof buildOnlineUser>) => {
    const redis = getRedisClient();
    await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
    await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));
};

describe('Controller > Call > Complete', () => {
    it('removes the call from redis', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const call = buildCallState({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`calls:${customer.id}--${attendant.id}`, JSON.stringify(call));
        await seedUsers(customer, attendant);

        const controller = new CallController();
        await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        expect(await redis.get(`calls:${customer.id}--${attendant.id}`)).toBeNull();
    });

    it('sets customer status to idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'in-call' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'in-call' });
        await seedUsers(customer, attendant);

        const controller = new CallController();
        await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        const stored = JSON.parse((await getRedisClient().get(`online_user:${customer.id}`))!);
        expect(stored.status).toBe('idle');
    });

    it('sets attendant status to idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'in-call' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'in-call' });
        await seedUsers(customer, attendant);

        const controller = new CallController();
        await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        const stored = JSON.parse((await getRedisClient().get(`online_user:${attendant.id}`))!);
        expect(stored.status).toBe('idle');
    });

    it('returns 400 when customer not found', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        await getRedisClient().set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new CallController();
        const either = await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendant not found', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        await getRedisClient().set(`online_user:${customer.id}`, JSON.stringify(customer));

        const controller = new CallController();
        const either = await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId is missing', async () => {
        const controller = new CallController();
        const either = await controller.complete.exec({ traceId: TRACE, mapped: { customerId: '', attendantId: 'att-1' } });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        await seedUsers(customer, attendant);

        const controller = new CallController();
        const either = await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
