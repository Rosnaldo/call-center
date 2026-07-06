import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { ChatController } from 'src/controllers/chat';
import { deleteFromS3 } from 'src/helpers/s3';

jest.mock('src/services/realtime', () => ({
    notifyChatMessageSent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('src/helpers/s3', () => ({
    uploadToS3: jest.fn().mockResolvedValue({}),
    deleteFromS3: jest.fn().mockResolvedValue({}),
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

describe('Controller > Chat > Delete', () => {
    it('removes the chat record from redis', async () => {
        const controller = new ChatController();
        await controller.sendMessage.exec({ traceId: TRACE, mapped: controller.sendMessage.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID, sender: 'customer', text: 'oi' }) });

        const either = await controller.delete.exec({ mapped: controller.delete.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID }) });

        expect(either.isError).toBe(false);
        expect(await getRedisClient().get(`chat:${CUSTOMER_ID}--${ATTENDANT_ID}`)).toBeNull();
    });

    it('deletes every file attachment from s3', async () => {
        const controller = new ChatController();
        await controller.uploadFile.exec({
            traceId: TRACE,
            mapped: {
                customerId: CUSTOMER_ID,
                attendantId: ATTENDANT_ID,
                sender: 'customer',
                buffer: Buffer.from('x'),
                originalName: 'a.pdf',
                mimetype: 'application/pdf',
                size: 1024,
            },
        });
        await controller.uploadFile.exec({
            traceId: TRACE,
            mapped: {
                customerId: CUSTOMER_ID,
                attendantId: ATTENDANT_ID,
                sender: 'attendant',
                buffer: Buffer.from('y'),
                originalName: 'b.png',
                mimetype: 'image/png',
                size: 1024,
            },
        });

        await controller.delete.exec({ mapped: controller.delete.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID }) });

        expect(deleteFromS3).toHaveBeenCalledTimes(2);
    });

    it('is a no-op when there is no chat to delete', async () => {
        const controller = new ChatController();
        const either = await controller.delete.exec({ mapped: controller.delete.mapper({ customerId: CUSTOMER_ID, attendantId: ATTENDANT_ID }) });

        expect(either.isError).toBe(false);
        expect(deleteFromS3).not.toHaveBeenCalled();
    });

    it('returns 400 when customerId or attendantId is missing', async () => {
        const controller = new ChatController();
        const either = await controller.delete.exec({ mapped: controller.delete.mapper({ customerId: '', attendantId: ATTENDANT_ID }) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
