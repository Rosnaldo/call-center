import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { ChatController } from 'src/controllers/chat';

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

const buildInput = (overrides: Record<string, unknown> = {}) => ({
    customerId: CUSTOMER_ID,
    attendantId: ATTENDANT_ID,
    sender: 'customer' as const,
    buffer: Buffer.from('file contents'),
    originalName: 'document.pdf',
    mimetype: 'application/pdf',
    size: 2 * 1024 * 1024,
    ...overrides,
});

describe('Controller > Chat > UploadFile', () => {
    it('uploads the file to s3 and appends a file message', async () => {
        const controller = new ChatController();
        const either = await controller.uploadFile.exec({ traceId: TRACE, mapped: buildInput() });

        if (either.isError) throw new Error(`Expected success, got: ${either.message}`);
        expect(either.data.file?.name).toBe('document.pdf');
        expect(either.data.file?.type).toBe('document');
        expect(either.data.file?.size).toBe('2.0 MB');
        expect(either.data.file?.url).toContain('chat/');

        const stored = JSON.parse((await getRedisClient().get(`chat:${CUSTOMER_ID}--${ATTENDANT_ID}`))!);
        expect(stored.messages).toHaveLength(1);
    });

    it('marks image mimetypes as image attachments', async () => {
        const controller = new ChatController();
        const either = await controller.uploadFile.exec({ traceId: TRACE, mapped: buildInput({ originalName: 'photo.png', mimetype: 'image/png' }) });

        if (either.isError) throw new Error('Expected success');
        expect(either.data.file?.type).toBe('image');
    });

    it('returns 400 when customerId or attendantId is missing', async () => {
        const controller = new ChatController();
        const either = await controller.uploadFile.exec({ traceId: TRACE, mapped: buildInput({ customerId: '' }) });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
