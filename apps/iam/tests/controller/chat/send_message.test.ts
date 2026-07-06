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
    jest.clearAllMocks();
});

describe('Controller > Chat > SendMessage', () => {
    it('creates a new chat record and appends the first message', async () => {
        const controller = new ChatController();
        const mapped = controller.sendMessage.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, sender: 'customer', text: 'Olá!' });
        const either = await controller.sendMessage.exec({ traceId: TRACE, mapped });

        if (either.isError) throw new Error(`Expected success, got: ${either.message}`);
        expect(either.data.text).toBe('Olá!');
        expect(either.data.sender).toBe('customer');

        const stored = JSON.parse((await getRedisClient().get(`chat:${CUSTOMER_ID}--${ATTENDANT_ID}`))!);
        expect(stored.messages).toHaveLength(1);
    });

    it('appends subsequent messages to the same chat record', async () => {
        const controller = new ChatController();
        await controller.sendMessage.exec({ traceId: TRACE, mapped: controller.sendMessage.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, sender: 'customer', text: 'oi' }) });
        await controller.sendMessage.exec({ traceId: TRACE, mapped: controller.sendMessage.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, sender: 'attendant', text: 'olá, tudo bem?' }) });

        const stored = JSON.parse((await getRedisClient().get(`chat:${CUSTOMER_ID}--${ATTENDANT_ID}`))!);
        expect(stored.messages).toHaveLength(2);
        expect(stored.messages[1].sender).toBe('attendant');
    });

    it('returns 400 when text is missing', async () => {
        const controller = new ChatController();
        const mapped = controller.sendMessage.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, sender: 'customer', text: '' });
        const either = await controller.sendMessage.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when sender is invalid', async () => {
        const controller = new ChatController();
        const mapped = controller.sendMessage.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, sender: 'admin', text: 'oi' });
        const either = await controller.sendMessage.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId or attendantId is missing', async () => {
        const controller = new ChatController();
        const mapped = controller.sendMessage.mapper({ customerId: '', attendantId: ATTENDANT_ID, sender: 'customer', text: 'oi' });
        const either = await controller.sendMessage.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
