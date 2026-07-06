import { Types } from 'mongoose';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { TransactionController } from 'src/controllers/transaction';
import { isSuccess } from 'src/utils/either';

beforeAll(async () => {
    await mongooseBootstrap();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

const seedTransactions = async (userId: string) => {
    const controller = new TransactionController();
    const entries = [
        { message: 'Recarga de tokens via Pix - Pacote Básico', type: 'reload', amount: 15 },
        { message: 'Consumo de chamada de vídeo: Ana Maria Silva', type: 'charge', amount: 3 },
        { message: 'Recarga de tokens via Pix - Pacote Intermediário', type: 'reload', amount: 30 },
        { message: 'Consumo de chamada de vídeo: Thiago Henrique', type: 'charge', amount: 2 },
    ];

    for (const entry of entries) {
        const mapped = controller.create.mapper({ userId, ...entry });
        // eslint-disable-next-line no-await-in-loop
        await controller.create.exec({ mapped });
    }
};

describe('Controller > Transaction > List', () => {
    it('paginates transactions for a given user and computes totals', async () => {
        const userId = new Types.ObjectId().toString();
        await seedTransactions(userId);

        const controller = new TransactionController();
        const params = controller.list.mapper({ userId, page: '1', limit: '2' });
        const either = await controller.list.get({ params });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data.transactions).toHaveLength(2);
        expect(either.data.total).toBe(4);
        expect(either.data.totalPages).toBe(2);
        expect(either.data.totalCredited).toBe(45);
        expect(either.data.totalDebited).toBe(5);
    });

    it('filters by type', async () => {
        const userId = new Types.ObjectId().toString();
        await seedTransactions(userId);

        const controller = new TransactionController();
        const params = controller.list.mapper({ userId, page: '1', limit: '10', type: 'charge' });
        const either = await controller.list.get({ params });

        if (!isSuccess(either)) throw new Error('Expected success');
        expect(either.data.transactions).toHaveLength(2);
        expect(either.data.transactions.every((tx) => tx.type === 'charge')).toBe(true);
    });

    it('filters by search term matching the message', async () => {
        const userId = new Types.ObjectId().toString();
        await seedTransactions(userId);

        const controller = new TransactionController();
        const params = controller.list.mapper({ userId, page: '1', limit: '10', search: 'Ana Maria' });
        const either = await controller.list.get({ params });

        if (!isSuccess(either)) throw new Error('Expected success');
        expect(either.data.transactions).toHaveLength(1);
        expect(either.data.transactions[0].message).toContain('Ana Maria Silva');
    });

    it('returns an empty page for a user with no transactions', async () => {
        const userId = new Types.ObjectId().toString();

        const controller = new TransactionController();
        const params = controller.list.mapper({ userId, page: '1', limit: '10' });
        const either = await controller.list.get({ params });

        if (!isSuccess(either)) throw new Error('Expected success');
        expect(either.data.transactions).toHaveLength(0);
        expect(either.data.total).toBe(0);
        expect(either.data.totalCredited).toBe(0);
        expect(either.data.totalDebited).toBe(0);
    });

    it('returns 400 when userId is not a valid ObjectId', async () => {
        const controller = new TransactionController();
        const params = controller.list.mapper({ userId: 'not-an-object-id', page: '1', limit: '10' });
        const either = await controller.list.get({ params });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
