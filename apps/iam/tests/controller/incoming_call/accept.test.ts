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

describe('Controller > IncomingCall > Accept', () => {
    it('accepts the incoming call and returns it', async () => {
        const incoming = buildIncomingCall();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: incoming.attendantId, userId: incoming.attendantId });
        const either = await controller.accept.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Expected success');

        expect(either.data.customerId).toBe(incoming.customerId);
        expect(either.data.attendantId).toBe(incoming.attendantId);
    });

    it('removes the incoming call from redis after accepting', async () => {
        const incoming = buildIncomingCall();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: incoming.attendantId, userId: incoming.attendantId });
        await controller.accept.exec({ mapped });

        const stored = await redis.get(`incoming_call:${incoming.attendantId}`);
        expect(stored).toBeNull();
    });

    it('updates call to accepted when a matching call exists', async () => {
        const incoming = buildIncomingCall();
        const call = buildCallState({ customerId: incoming.customerId, attendantId: incoming.attendantId });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));
        await redis.hset('calls', call.id, JSON.stringify(call));

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: incoming.attendantId, userId: incoming.attendantId });
        await controller.accept.exec({ mapped });

        const stored = JSON.parse((await redis.hget('calls', call.id))!);
        expect(stored.customerInCall).toBe(true);
        expect(stored.attendantInCall).toBe(true);
    });

    it('sets customer status to in-call', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));
        await redis.hset('online_users', customer.id, JSON.stringify(customer));
        await redis.hset('online_users', attendant.id, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: incoming.attendantId, userId: incoming.attendantId });
        await controller.accept.exec({ mapped });

        const stored = JSON.parse((await redis.hget('online_users', customer.id))!);
        expect(stored.status).toBe('in-call');
    });

    it('sets attendant status to in-call', async () => {
        const customer = buildOnlineUser({ role: 'customer' });
        const attendant = buildOnlineUser({ role: 'attendant' });
        const incoming = buildIncomingCall({ customerId: customer.id, attendantId: attendant.id });
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));
        await redis.hset('online_users', customer.id, JSON.stringify(customer));
        await redis.hset('online_users', attendant.id, JSON.stringify(attendant));

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: incoming.attendantId, userId: incoming.attendantId });
        await controller.accept.exec({ mapped });

        const stored = JSON.parse((await redis.hget('online_users', attendant.id))!);
        expect(stored.status).toBe('in-call');
    });

    it('notifies the realtime service', async () => {
        const incoming = buildIncomingCall();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: incoming.attendantId, userId: incoming.attendantId });
        await controller.accept.exec({ mapped });

        expect(api.post).toHaveBeenCalledWith('/webhooks/iam', {
            event: 'call_accepted',
            payload: { customerId: incoming.customerId, attendantId: incoming.attendantId },
        });
    });

    it('returns 400 when incoming call does not exist', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: 'att-1', userId: 'att-1' });
        const either = await controller.accept.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customer tries to accept', async () => {
        const incoming = buildIncomingCall();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: incoming.attendantId, userId: incoming.customerId });
        const either = await controller.accept.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when attendantId is missing', async () => {
        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ userId: 'user-1' });
        const either = await controller.accept.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const incoming = buildIncomingCall();
        const redis = getRedisClient();
        await redis.set(`incoming_call:${incoming.attendantId}`, JSON.stringify(incoming));

        const controller = new IncomingCallController();
        const mapped = controller.accept.mapper({ attendantId: incoming.attendantId, userId: incoming.attendantId });
        const either = await controller.accept.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
