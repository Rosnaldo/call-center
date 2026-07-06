import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { ChatController } from 'src/controllers/chat';

jest.mock('src/services/realtime', () => ({
    notifyChatMessageSent: jest.fn().mockResolvedValue(undefined),
}));

const TRACE = 'test-trace';
const CUSTOMER_ID = 'cust-1';
const ATTENDANT_ID = 'att-1';

beforeAll(async () => {
    await connectRedis();
});

afterAll(async () => {
    await disconnectRedis();
});

beforeEach(async () => {
    await getRedisClient().flushall();
});

describe('Controller > Chat > GetMessages', () => {
    it('returns an empty message list when no chat exists yet', async () => {
        const controller = new ChatController();
        const mapped = controller.getMessages.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID });
        const either = await controller.getMessages.exec({ mapped });

        if (either.isError) throw new Error('Expected success');
        expect(either.data.messages).toEqual([]);
        expect(either.data.customerId).toBe(CUSTOMER_ID);
    });

    it('returns the persisted messages', async () => {
        const controller = new ChatController();
        await controller.sendMessage.exec({ traceId: TRACE, mapped: controller.sendMessage.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, sender: 'customer', text: 'oi' }) });

        const either = await controller.getMessages.exec({ mapped: controller.getMessages.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID }) });

        if (either.isError) throw new Error('Expected success');
        expect(either.data.messages).toHaveLength(1);
        expect(either.data.messages[0].text).toBe('oi');
    });

    it('returns 400 when customerId or attendantId is missing', async () => {
        const controller = new ChatController();
        const either = await controller.getMessages.exec({ mapped: controller.getMessages.mapper({ customerId: '', attendantId: ATTENDANT_ID }) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
