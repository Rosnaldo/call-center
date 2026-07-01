import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { IncomingCallController } from 'src/controllers/incoming_call';
import { isSuccess } from 'src/utils/either';
import { buildOnlineUser, buildIncomingCall } from '../../builders';

jest.mock('src/services/realtime', () => ({
    notifyIncomingCallSent: jest.fn().mockResolvedValue(undefined),
}));

const mockFindById = jest.fn();
jest.mock('src/crud/user', () => ({
    UserCrud: jest.fn().mockImplementation(() => ({ findById: mockFindById })),
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
    mockFindById.mockResolvedValue({ tokens: 5 });
});

const TRACE = 'test-trace';

describe('Controller > IncomingCall > Send', () => {
    it('stores the incoming call in redis and returns it', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'idle' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
        await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const mapped = controller.send.mapper(incoming);
        const either = await controller.send.exec({ traceId: TRACE, mapped });

        if (!isSuccess(either)) throw new Error('Expected success');
        expect(either.data.customerId).toBe(customer.id);
        expect(either.data.attendantId).toBe(attendant.id);

        const stored = await redis.get(`incoming_call:${attendant.id}`);
        expect(stored).not.toBeNull();
        expect(JSON.parse(stored!).customerId).toBe(customer.id);
    });

    it('sets customer status to occupied', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'idle' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
        await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        await controller.send.exec({ traceId: TRACE, mapped: controller.send.mapper(incoming) });

        const stored = JSON.parse((await redis.get(`online_user:${customer.id}`))!);
        expect(stored.status).toBe('occupied');
    });

    it('sets attendant status to occupied', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'idle' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
        await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        await controller.send.exec({ traceId: TRACE, mapped: controller.send.mapper(incoming) });

        const stored = JSON.parse((await redis.get(`online_user:${attendant.id}`))!);
        expect(stored.status).toBe('occupied');
    });

    it('returns 400 when attendant already has an incoming call', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'idle' });
        const redis = getRedisClient();
        await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
        await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const existing = buildIncomingCall({ attendantId: attendant.id });
        await redis.set(`incoming_call:${attendant.id}`, JSON.stringify(existing));

        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const controller = new IncomingCallController();
        const either = await controller.send.exec({ traceId: TRACE, mapped: controller.send.mapper(incoming) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customer is not idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'occupied' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'idle' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
        await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const either = await controller.send.exec({ traceId: TRACE, mapped: controller.send.mapper(incoming) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customer has no tokens', async () => {
        mockFindById.mockResolvedValue({ tokens: 0 });
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'idle' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
        await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const either = await controller.send.exec({ traceId: TRACE, mapped: controller.send.mapper(incoming) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customer not found', async () => {
        const attendant = buildOnlineUser({ role: 'attendant', status: 'idle' });
        const incoming = buildIncomingCall({ attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const either = await controller.send.exec({ traceId: TRACE, mapped: controller.send.mapper(incoming) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendant not found', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const incoming = buildIncomingCall({ customerId: customer.id });
        const redis = getRedisClient();
        await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));

        const controller = new IncomingCallController();
        const either = await controller.send.exec({ traceId: TRACE, mapped: controller.send.mapper(incoming) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.send.mapper({ attendantId: 'att-1', calledBy: 'customer' });
        const either = await controller.send.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendantId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.send.mapper({ customerId: 'cust-1', calledBy: 'customer' });
        const either = await controller.send.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'idle' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`online_user:${customer.id}`, JSON.stringify(customer));
        await redis.set(`online_user:${attendant.id}`, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const either = await controller.send.exec({ traceId: TRACE, mapped: controller.send.mapper(incoming) });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
