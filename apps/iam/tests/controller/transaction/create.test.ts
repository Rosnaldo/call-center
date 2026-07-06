import { Types } from 'mongoose';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { TransactionController } from 'src/controllers/transaction';
import { isSuccess } from 'src/utils/either';
import { getTransactionModel } from 'src/entities/models/singleton';

beforeAll(async () => {
    await mongooseBootstrap();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

const buildBody = (overrides: Record<string, unknown> = {}) => ({
    userId: new Types.ObjectId().toString(),
    message: 'Recarga de tokens via Pix',
    type: 'reload',
    amount: 30,
    ...overrides,
});

describe('Controller > Transaction > Create', () => {
    it('persists the transaction record in mongo and returns it', async () => {
        const controller = new TransactionController();
        const body = buildBody();
        const mapped = controller.create.mapper(body);
        const either = await controller.create.exec({ mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data.message).toBe(body.message);
        expect(either.data.type).toBe(body.type);
        expect(either.data.amount).toBe(body.amount);
        expect(either.data.id).toBeTruthy();
        expect(either.data.date).toBeTruthy();

        const saved = await getTransactionModel().findById(either.data.id).lean();
        expect(saved).not.toBeNull();
        expect(saved!.userId).toBe(body.userId);
        expect(saved!.amount).toBe(body.amount);
    });

    it('creates a charge transaction', async () => {
        const controller = new TransactionController();
        const mapped = controller.create.mapper(buildBody({ type: 'charge', message: 'Consumo de chamada', amount: 3 }));
        const either = await controller.create.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Expected success');
        expect(either.data.type).toBe('charge');
        expect(either.data.amount).toBe(3);
    });

    it('returns 400 when userId is not a valid ObjectId', async () => {
        const controller = new TransactionController();
        const mapped = controller.create.mapper(buildBody({ userId: 'not-an-object-id' }));
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when type is invalid', async () => {
        const controller = new TransactionController();
        const mapped = controller.create.mapper(buildBody({ type: 'invalid-type' }));
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when amount is not positive', async () => {
        const controller = new TransactionController();
        const mapped = controller.create.mapper(buildBody({ amount: 0 }));
        const either = await controller.create.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
