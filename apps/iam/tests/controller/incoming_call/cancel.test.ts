import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { IncomingCallController } from 'src/controllers/incoming_call';
import { isSuccess } from 'src/utils/either';
import { buildOnlineUser, buildIncomingCall, buildCallState } from '../../builders';

jest.mock('src/services/realtime', () => ({
    notifyIncomingCallCancelled: jest.fn().mockResolvedValue(undefined),
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

describe('Controller > IncomingCall > Cancel', () => {
    it('removes the incoming call from redis', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${attendant.id}`, JSON.stringify(incoming));
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: customer.id, attendantId: attendant.id });
        const either = await controller.cancel.exec({ traceId: TRACE, mapped });

        expect(isSuccess(either)).toBe(true);
        expect(await redis.get(`incoming_call:${attendant.id}`)).toBeNull();
    });

    it('removes matching call from redis when it exists', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const call = buildCallState({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${attendant.id}`, JSON.stringify(incoming));
        await redis.set(`calls:${customer.id}--${attendant.id}`, JSON.stringify(call));
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        await controller.cancel.exec({ traceId: TRACE, mapped: controller.cancel.mapper({ customerId: customer.id, attendantId: attendant.id }) });

        expect(await redis.get(`calls:${customer.id}--${attendant.id}`)).toBeNull();
    });

    it('does not delete unrelated calls', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const unrelatedCall = buildCallState();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${attendant.id}`, JSON.stringify(incoming));
        await redis.set(`calls:${unrelatedCall.customerId}--${unrelatedCall.attendantId}`, JSON.stringify(unrelatedCall));
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        await controller.cancel.exec({ traceId: TRACE, mapped: controller.cancel.mapper({ customerId: customer.id, attendantId: attendant.id }) });

        expect(await redis.get(`calls:${unrelatedCall.customerId}--${unrelatedCall.attendantId}`)).not.toBeNull();
    });

    it('sets customer status to idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'occupied' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'occupied' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${attendant.id}`, JSON.stringify(incoming));
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        await controller.cancel.exec({ traceId: TRACE, mapped: controller.cancel.mapper({ customerId: customer.id, attendantId: attendant.id }) });

        const stored = JSON.parse((await redis.get(`online_user:${customer.id}`))!);
        expect(stored.status).toBe('idle');
    });

    it('sets attendant status to idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'occupied' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'occupied' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${attendant.id}`, JSON.stringify(incoming));
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        await controller.cancel.exec({ traceId: TRACE, mapped: controller.cancel.mapper({ customerId: customer.id, attendantId: attendant.id }) });

        const stored = JSON.parse((await redis.get(`online_user:${attendant.id}`))!);
        expect(stored.status).toBe('idle');
    });

    it('returns 400 when customer not found', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await getRedisClient().set(`incoming_call:${attendant.id}`, JSON.stringify(incoming));
        await getRedisClient().set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const either = await controller.cancel.exec({ traceId: TRACE, mapped: controller.cancel.mapper({ customerId: customer.id, attendantId: attendant.id }) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendant not found', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await getRedisClient().set(`incoming_call:${attendant.id}`, JSON.stringify(incoming));
        await getRedisClient().set(`online_user:${customer.id}`, JSON.stringify(customer));

        const controller = new IncomingCallController();
        const either = await controller.cancel.exec({ traceId: TRACE, mapped: controller.cancel.mapper({ customerId: customer.id, attendantId: attendant.id }) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ attendantId: 'att-1' });
        const either = await controller.cancel.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendantId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: 'cust-1' });
        const either = await controller.cancel.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
