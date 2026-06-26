import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { IncomingCallController } from 'src/controllers/incoming_call';
import { isSuccess } from 'src/utils/either';
import { buildOnlineUser, buildIncomingCall } from '../../builders';

jest.mock('src/apis/realtime', () => ({
    realtimeApi: { post: jest.fn().mockResolvedValue({}) },
}));

import { realtimeApi } from 'src/apis/realtime';
const api = realtimeApi as jest.Mocked<typeof realtimeApi>;

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

describe('Controller > IncomingCall > Send', () => {
    it('stores the incoming call in redis and returns it', async () => {
        const incoming = buildIncomingCall();
        const controller = new IncomingCallController();
        const mapped = controller.send.mapper(incoming);
        const either = await controller.send.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Expected success');

        expect(either.data.customerId).toBe(incoming.customerId);
        expect(either.data.attendantId).toBe(incoming.attendantId);
        expect(either.data.calledBy).toBe(incoming.calledBy);

        const redis = getRedisClient();
        const stored = await redis.get(`incoming_call:${incoming.attendantId}`);
        expect(stored).not.toBeNull();
        expect(JSON.parse(stored!).customerId).toBe(incoming.customerId);
    });

    it('sets customer status to occupied', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.hset('online_users', customer.id, JSON.stringify(customer));
        await redis.hset('online_users', attendant.id, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const mapped = controller.send.mapper(incoming);
        await controller.send.exec({ mapped });

        const stored = JSON.parse((await redis.hget('online_users', customer.id))!);
        expect(stored.status).toBe('occupied');
    });

    it('sets attendant status to occupied', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.hset('online_users', customer.id, JSON.stringify(customer));
        await redis.hset('online_users', attendant.id, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const mapped = controller.send.mapper(incoming);
        await controller.send.exec({ mapped });

        const stored = JSON.parse((await redis.hget('online_users', attendant.id))!);
        expect(stored.status).toBe('occupied');
    });

    it('notifies the realtime service', async () => {
        const incoming = buildIncomingCall();
        const controller = new IncomingCallController();
        const mapped = controller.send.mapper(incoming);
        await controller.send.exec({ mapped });

        expect(api.post).toHaveBeenCalledWith('/webhooks/iam', {
            event: 'incoming_call_sent',
            payload: {
                customerId: incoming.customerId,
                attendantId: incoming.attendantId,
                calledBy: incoming.calledBy,
            },
        });
    });

    it('returns 400 when attendant already has an incoming call', async () => {
        const existing = buildIncomingCall();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${existing.attendantId}`, JSON.stringify(existing));

        const incoming = buildIncomingCall({ attendantId: existing.attendantId });
        const controller = new IncomingCallController();
        const mapped = controller.send.mapper(incoming);
        const either = await controller.send.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.send.mapper({ attendantId: 'att-1', calledBy: 'customer' });
        const either = await controller.send.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendantId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.send.mapper({ customerId: 'cust-1', calledBy: 'customer' });
        const either = await controller.send.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const incoming = buildIncomingCall();
        const controller = new IncomingCallController();
        const mapped = controller.send.mapper(incoming);
        const either = await controller.send.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
