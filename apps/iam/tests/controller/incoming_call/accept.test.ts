import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { IncomingCallController } from 'src/controllers/incoming_call';
import { isSuccess } from 'src/utils/either';
import { buildOnlineUser, buildIncomingCall, buildCallState } from '../../builders';

jest.mock('src/services/realtime', () => ({
    notifyCallAccepted: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('src/services/daily', () => ({
    ensureDailyRoom: jest.fn().mockResolvedValue(undefined),
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

const seedIncomingCall = async (incoming: ReturnType<typeof buildIncomingCall>) => {
    await getRedisClient().set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));
};

const seedUsers = async (customer: ReturnType<typeof buildOnlineUser>, attendant: ReturnType<typeof buildOnlineUser>) => {
    const redis = getRedisClient();
    await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
    await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));
};

describe('Controller > IncomingCall > Accept', () => {
    it('accepts the incoming call and returns it', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await seedIncomingCall(incoming);
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: attendant.id, userId: attendant.id });
        const either = await controller.accept.exec({ traceId: TRACE, mapped });

        if (!isSuccess(either)) throw new Error('Expected success');
        expect(either.data.customerId).toBe(customer.id);
        expect(either.data.attendantId).toBe(attendant.id);
    });

    it('removes the incoming call from redis after accepting', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await seedIncomingCall(incoming);
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        await controller.accept.exec({ traceId: TRACE, mapped: controller.accept.mapper({ attendantId: attendant.id, userId: attendant.id }) });

        const stored = await getRedisClient().get(`incoming_call:${attendant.id}`);
        expect(stored).toBeNull();
    });

    it('leaves an existing call untouched', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const call = buildCallState({ customerId: customer.id, attendantId: attendant.id, accumulatedMs: 42_000 });
        const redis = getRedisClient();
        await seedIncomingCall(incoming);
        await seedUsers(customer, attendant);
        await redis.set(`calls:${customer.id}--${attendant.id}`, JSON.stringify(call));

        const controller = new IncomingCallController();
        await controller.accept.exec({ traceId: TRACE, mapped: controller.accept.mapper({ attendantId: attendant.id, userId: attendant.id }) });

        const stored = JSON.parse((await redis.get(`calls:${customer.id}--${attendant.id}`))!);
        expect(stored.accumulatedMs).toBe(42_000);
    });

    it('sets customer status to in-call', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await seedIncomingCall(incoming);
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        await controller.accept.exec({ traceId: TRACE, mapped: controller.accept.mapper({ attendantId: attendant.id, userId: attendant.id }) });

        const stored = JSON.parse((await getRedisClient().get(`online_user:${customer.id}`))!);
        expect(stored.status).toBe('in-call');
    });

    it('sets attendant status to in-call', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await seedIncomingCall(incoming);
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        await controller.accept.exec({ traceId: TRACE, mapped: controller.accept.mapper({ attendantId: attendant.id, userId: attendant.id }) });

        const stored = JSON.parse((await getRedisClient().get(`online_user:${attendant.id}`))!);
        expect(stored.status).toBe('in-call');
    });

    it('returns 400 when incoming call does not exist', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: 'att-1', userId: 'att-1' });
        const either = await controller.accept.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customer tries to accept', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await seedIncomingCall(incoming);
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: attendant.id, userId: customer.id });
        const either = await controller.accept.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customer not found', async () => {
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ attendantId: attendant.id });
        await seedIncomingCall(incoming);
        await getRedisClient().set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const either = await controller.accept.exec({ traceId: TRACE, mapped: controller.accept.mapper({ attendantId: attendant.id, userId: attendant.id }) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendant not found', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await seedIncomingCall(incoming);
        await getRedisClient().set(`online_user:${customer.id}`, JSON.stringify(customer));

        const controller = new IncomingCallController();
        const either = await controller.accept.exec({ traceId: TRACE, mapped: controller.accept.mapper({ attendantId: attendant.id, userId: attendant.id }) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendantId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ userId: 'user-1' });
        const either = await controller.accept.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        await seedIncomingCall(incoming);
        await seedUsers(customer, attendant);

        const controller = new IncomingCallController();
        const either = await controller.accept.exec({ traceId: TRACE, mapped: controller.accept.mapper({ attendantId: attendant.id, userId: attendant.id }) });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
