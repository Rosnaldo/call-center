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

describe('Controller > Call > Create', () => {
    it('stores the call in redis and returns it', async () => {
        const call = buildCallState();
        const controller = new CallController();
        const mapped = controller.create.mapper(call);
        const either = await controller.create.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data.id).toBe(call.id);
        expect(either.data.customerId).toBe(call.customerId);
        expect(either.data.customerName).toBe(call.customerName);
        expect(either.data.attendantId).toBe(call.attendantId);
        expect(either.data.attendantName).toBe(call.attendantName);
        expect(either.data.roomName).toBe(call.roomName);

        const redis = getRedisClient();
        const key = `calls:${call.customerId}--${call.attendantId}`;
        const stored = await redis.get(key);
        expect(stored).not.toBeNull();
        expect(JSON.parse(stored!).customerId).toBe(call.customerId);
    });

    it('returns 400 when required fields are missing', async () => {
        const controller = new CallController();
        const mapped = controller.create.mapper({ customerId: 'cust-1' });
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('persists multiple calls independently', async () => {
        const call1 = buildCallState({ customerName: 'Cliente A', attendantName: 'Agente A' });
        const call2 = buildCallState({ customerName: 'Cliente B', attendantName: 'Agente B' });

        const controller = new CallController();

        const either1 = await controller.create.exec({ mapped: controller.create.mapper(call1) });
        const either2 = await controller.create.exec({ mapped: controller.create.mapper(call2) });

        if (!isSuccess(either1) || !isSuccess(either2)) throw new Error('Both should succeed');

        expect(either1.data.customerName).toBe('Cliente A');
        expect(either2.data.customerName).toBe('Cliente B');

        const redis = getRedisClient();
        const key1 = `calls:${call1.customerId}--${call1.attendantId}`;
        const key2 = `calls:${call2.customerId}--${call2.attendantId}`;
        const stored1 = await redis.get(key1);
        const stored2 = await redis.get(key2);
        expect(stored1).not.toBeNull();
        expect(stored2).not.toBeNull();
    });

    it('returns isError false and status 200 on success', async () => {
        const call = buildCallState();
        const controller = new CallController();
        const mapped = controller.create.mapper(call);
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
