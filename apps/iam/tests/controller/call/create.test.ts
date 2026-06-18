import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { CallController } from 'src/controllers/call';
import { isSuccess } from 'src/utils/either';
import { getCallModel } from 'src/entities/models/singleton';
import { validateOutput } from 'src/validations/call/create';
import { buildCall } from '../../builders';

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

beforeAll(async () => {
    await mongooseBootstrap();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

describe('Controller > Call > Create', () => {
    it('persists the call in the database with the correct fields', async () => {
        const call = buildCall();
        const body = {
            customerId: call.customerId,
            customerName: call.customerName,
            attendantId: call.attendantId,
            attendantName: call.attendantName,
            roomUrl: call.roomUrl,
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
        expect(either.data.roomUrl).toBe(body.roomUrl);
        expect(either.data.createdAt).toBeInstanceOf(Date);
        expect(either.data.updatedAt).toBeInstanceOf(Date);

        const saved = await getCallModel().findById(either.data._id).lean();
        expect(saved).not.toBeNull();
        expect(saved!.customerId).toBe(body.customerId);
        expect(saved!.attendantId).toBe(body.attendantId);
        expect(saved!.roomUrl).toBe(body.roomUrl);

        const zodResult = validateOutput(either.data);
        expect(zodResult.hasError).toBeFalsy();
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

    it('returns 400 when roomUrl is not a valid URL', async () => {
        const call = buildCall({ roomUrl: 'not-a-valid-url' });
        const body = {
            customerId: call.customerId,
            customerName: call.customerName,
            attendantId: call.attendantId,
            attendantName: call.attendantName,
            roomUrl: call.roomUrl,
        };

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
            roomUrl: c.roomUrl,
        });

        const either1 = await controller.create.exec({ mapped: controller.create.mapper(toBody(call1)) });
        const either2 = await controller.create.exec({ mapped: controller.create.mapper(toBody(call2)) });

        if (!isSuccess(either1) || !isSuccess(either2)) throw new Error('Both should succeed');

        expect(either1.data._id).not.toBe(either2.data._id);
        expect(either1.data.customerName).toBe('Cliente A');
        expect(either2.data.customerName).toBe('Cliente B');
    });
});
