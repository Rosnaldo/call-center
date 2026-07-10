import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { CallController } from 'src/controllers/call';
import { buildOnlineUser, buildCallState } from '../../builders';

jest.mock('src/services/call_events', () => ({
    notifyCallCompleted: jest.fn(),
}));

jest.mock('src/services/daily', () => ({
    ejectBothParticipantsFromRoom: jest.fn().mockResolvedValue(undefined),
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

const seedCall = async (customerId: string, attendantId: string) => {
    const call = buildCallState({ customerId, attendantId });
    await getRedisClient().set(`calls:${customerId}--${attendantId}`, JSON.stringify(call));
    return call;
};

describe('Controller > Call > Complete', () => {
    it('sets customer status to idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'in-call' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'in-call' });
        await seedUsers(customer, attendant);
        await seedCall(customer.id, attendant.id);

        const controller = new CallController();
        await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        const stored = JSON.parse((await getRedisClient().get(`online_user:${customer.id}`))!);
        expect(stored.status).toBe('idle');
    });

    it('sets attendant status to idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'in-call' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'in-call' });
        await seedUsers(customer, attendant);
        await seedCall(customer.id, attendant.id);

        const controller = new CallController();
        await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        const stored = JSON.parse((await getRedisClient().get(`online_user:${attendant.id}`))!);
        expect(stored.status).toBe('idle');
    });

    // A disconnected user's presence entry (90s TTL) can legitimately expire
    // before the 2-minute grace period that forces this completion even
    // finishes counting down — that must not block ending the call, since
    // this is exactly the recovery path meant to close it out.
    it('still completes the call when the customer presence entry is already gone', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'in-call' });
        await getRedisClient().set(`online_user:${attendant.id}`, JSON.stringify(attendant));
        await seedCall(customer.id, attendant.id);

        const controller = new CallController();
        const either = await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        expect(either.isError).toBe(false);

        const attendantStored = JSON.parse((await getRedisClient().get(`online_user:${attendant.id}`))!);
        expect(attendantStored.status).toBe('idle');
        expect(await getRedisClient().get(`online_user:${customer.id}`)).toBeNull();
    });

    it('no-ops successfully when the call record no longer exists', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        await seedUsers(customer, attendant);

        const controller = new CallController();
        const either = await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        expect(either.isError).toBe(false);

        // nothing to complete — presence untouched
        const customerStored = JSON.parse((await getRedisClient().get(`online_user:${customer.id}`))!);
        expect(customerStored.status).toBe(customer.status);
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
        await seedCall(customer.id, attendant.id);

        const controller = new CallController();
        const either = await controller.complete.exec({ traceId: TRACE, mapped: { customerId: customer.id, attendantId: attendant.id } });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
