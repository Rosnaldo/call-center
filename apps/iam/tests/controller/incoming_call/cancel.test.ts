import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { IncomingCallController } from 'src/controllers/incoming_call';
import { isSuccess } from 'src/utils/either';
import { buildOnlineUser, buildIncomingCall, buildCallState } from '../../builders';

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

describe('Controller > IncomingCall > Cancel', () => {
    it('removes the incoming call from redis', async () => {
        const incoming = buildIncomingCall();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));

        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: incoming.customerId, attendantId: incoming.attendantId });
        const either = await controller.cancel.exec({ mapped });

        expect(isSuccess(either)).toBe(true);
        const stored = await redis.get(`incoming_call:${incoming.attendantId}`);
        expect(stored).toBeNull();
    });

    it('removes matching call from redis when it exists', async () => {
        const incoming = buildIncomingCall();
        const call = buildCallState({ customerId: incoming.customerId, attendantId: incoming.attendantId });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));
        await redis.hset('calls', call.id, JSON.stringify(call));

        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: incoming.customerId, attendantId: incoming.attendantId });
        await controller.cancel.exec({ mapped });

        const stored = await redis.hget('calls', call.id);
        expect(stored).toBeNull();
    });

    it('does not delete unrelated calls', async () => {
        const incoming = buildIncomingCall();
        const unrelatedCall = buildCallState();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));
        await redis.hset('calls', unrelatedCall.id, JSON.stringify(unrelatedCall));

        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: incoming.customerId, attendantId: incoming.attendantId });
        await controller.cancel.exec({ mapped });

        const stored = await redis.hget('calls', unrelatedCall.id);
        expect(stored).not.toBeNull();
    });

    it('sets customer status to idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'occupied' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'occupied' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));
        await redis.hset('online_users', customer.id, JSON.stringify(customer));
        await redis.hset('online_users', attendant.id, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: incoming.customerId, attendantId: incoming.attendantId });
        await controller.cancel.exec({ mapped });

        const stored = JSON.parse((await redis.hget('online_users', customer.id))!);
        expect(stored.status).toBe('idle');
    });

    it('sets attendant status to idle', async () => {
        const customer = buildOnlineUser({ role: 'customer', status: 'occupied' });
        const attendant = buildOnlineUser({ role: 'attendant', status: 'occupied' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));
        await redis.hset('online_users', customer.id, JSON.stringify(customer));
        await redis.hset('online_users', attendant.id, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: incoming.customerId, attendantId: incoming.attendantId });
        await controller.cancel.exec({ mapped });

        const stored = JSON.parse((await redis.hget('online_users', attendant.id))!);
        expect(stored.status).toBe('idle');
    });

    it('notifies the realtime service', async () => {
        const incoming = buildIncomingCall();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));

        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: incoming.customerId, attendantId: incoming.attendantId });
        await controller.cancel.exec({ mapped });

        expect(api.post).toHaveBeenCalledWith('/webhooks/iam', {
            event: 'incoming_call_cancelled',
            payload: { customerId: incoming.customerId, attendantId: incoming.attendantId },
        });
    });

    it('returns 400 when customerId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ attendantId: 'att-1' });
        const either = await controller.cancel.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendantId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.cancel.mapper({ customerId: 'cust-1' });
        const either = await controller.cancel.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
