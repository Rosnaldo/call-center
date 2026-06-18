import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { CallController } from 'src/controllers/call';
import { isSuccess } from 'src/utils/either';
import { getCallModel } from 'src/entities/models/singleton';
import { validateOutput } from 'src/validations/call/create';
import { buildCall } from '../../builders';
import { dailyApi } from 'src/apis/daily';

jest.mock('src/keycloak/singleton', () => ({
    getKcMain: jest.fn().mockReturnValue({
        getKcClientCredentials: jest.fn().mockResolvedValue({
            users: {
                create: jest.fn().mockResolvedValue({}),
                find: jest.fn().mockResolvedValue([{ id: 'mock-kc-user-id' }]),
                del: jest.fn().mockResolvedValue(undefined),
                update: jest.fn().mockResolvedValue(undefined),
            },
        }),
    }),
    buildKcMain: jest.fn().mockResolvedValue({}),
}));

jest.mock('src/apis/daily', () => ({
    dailyApi: { post: jest.fn() },
}));

const mockDailyRoom = {
    id: 'daily-room-id',
    name: 'generated-room',
    api_created: true,
    privacy: 'public',
    url: 'https://meetcent.daily.co/generated-room',
    created_at: '2024-01-01T00:00:00.000Z',
};

const api = dailyApi as jest.Mocked<typeof dailyApi>;

beforeAll(async () => {
    await mongooseBootstrap();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

beforeEach(() => {
    jest.clearAllMocks();
    (api.post as jest.Mock).mockResolvedValue({ data: mockDailyRoom });
});

describe('Controller > Call > Create', () => {
    it('persists the call in the database with the correct fields', async () => {
        const call = buildCall();
        const body = {
            customerId: call.customerId,
            customerName: call.customerName,
            attendantId: call.attendantId,
            attendantName: call.attendantName,
        };

        const controller = new CallController();
        const mapped = controller.create.mapper(body);
        const either = await controller.create.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data._id).toBeDefined();
        expect(either.data.customerId).toBe(body.customerId);
        expect(either.data.customerName).toBe(body.customerName);
        expect(either.data.attendantId).toBe(body.attendantId);
        expect(either.data.attendantName).toBe(body.attendantName);
        expect(either.data.roomUrl).toBe(mockDailyRoom.url);
        expect(either.data.createdAt).toBeInstanceOf(Date);
        expect(either.data.updatedAt).toBeInstanceOf(Date);

        const saved = await getCallModel().findById(either.data._id).lean();
        expect(saved).not.toBeNull();
        expect(saved!.customerId).toBe(body.customerId);
        expect(saved!.attendantId).toBe(body.attendantId);
        expect(saved!.roomUrl).toBe(mockDailyRoom.url);

        const zodResult = validateOutput(either.data);
        expect(zodResult.hasError).toBeFalsy();
    });

    it('cria a room no Daily.co ao criar a call', async () => {
        const call = buildCall();
        const body = {
            customerId: call.customerId,
            customerName: call.customerName,
            attendantId: call.attendantId,
            attendantName: call.attendantName,
        };

        const controller = new CallController();
        const mapped = controller.create.mapper(body);
        await controller.create.exec({ mapped });

        expect(api.post).toHaveBeenCalledWith('/rooms');
    });

    it('retorna a roomUrl vinda do Daily.co', async () => {
        const call = buildCall();
        const body = {
            customerId: call.customerId,
            customerName: call.customerName,
            attendantId: call.attendantId,
            attendantName: call.attendantName,
        };

        const controller = new CallController();
        const mapped = controller.create.mapper(body);
        const either = await controller.create.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data.roomUrl).toBe(mockDailyRoom.url);
    });

    it('returns 400 when required fields are missing', async () => {
        const call = buildCall();
        const body = { customerId: call.customerId };

        const controller = new CallController();
        const mapped = controller.create.mapper(body);
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('persists multiple calls independently', async () => {
        const call1 = buildCall({ customerName: 'Cliente A', attendantName: 'Agente A' });
        const call2 = buildCall({ customerName: 'Cliente B', attendantName: 'Agente B' });

        const controller = new CallController();

        const toBody = (c: typeof call1) => ({
            customerId: c.customerId,
            customerName: c.customerName,
            attendantId: c.attendantId,
            attendantName: c.attendantName,
        });

        const either1 = await controller.create.exec({ mapped: controller.create.mapper(toBody(call1)) });
        const either2 = await controller.create.exec({ mapped: controller.create.mapper(toBody(call2)) });

        if (!isSuccess(either1) || !isSuccess(either2)) throw new Error('Both should succeed');

        expect(either1.data._id).not.toBe(either2.data._id);
        expect(either1.data.customerName).toBe('Cliente A');
        expect(either2.data.customerName).toBe('Cliente B');
    });

    it('retorna 500 quando o Daily.co falha', async () => {
        (api.post as jest.Mock).mockRejectedValue(new Error('Daily API unavailable'));

        const call = buildCall();
        const body = {
            customerId: call.customerId,
            customerName: call.customerName,
            attendantId: call.attendantId,
            attendantName: call.attendantName,
        };

        const controller = new CallController();
        const mapped = controller.create.mapper(body);
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(500);
    });
});
