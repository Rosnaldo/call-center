import { mockUser } from '../../entities/schemas/user/mock';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { UserController } from 'src/controllers/user';
import { isSuccess } from 'src/utils/either';
import { IUser } from 'src/entities/schemas/user/types';
import { getUserModel, getTransactionModel } from 'src/entities/models/singleton';

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

jest.mock('src/services/realtime', () => ({
    notifyUserTokenCharged: jest.fn().mockResolvedValue(undefined),
}));

import * as realtimeService from 'src/services/realtime';

const notifyUserTokenChargedMock = realtimeService.notifyUserTokenCharged as jest.Mock;

const TRACE = 'test-trace';

let user: IUser['IParams'];

beforeAll(async () => {
    await mongooseBootstrap();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

beforeEach(async () => {
    const builder = mockUser();
    user = await builder.save();
    await getUserModel().findByIdAndUpdate(user._id, { tokens: 10 });
    jest.clearAllMocks();
});

describe('Controller > User > ChargeToken', () => {
    it('subtracts the charged tokens and saves the user', async () => {
        const controller = new UserController();
        const mapped = controller.chargeToken.mapper({ customerId: user._id, tokens: 3, attendantName: 'Test Attendant', durationMs: 65_000, endedAt: new Date('2026-01-01T10:01:05Z') });
        const either = await controller.chargeToken.exec({ traceId: TRACE, mapped });

        if (!isSuccess(either)) throw new Error(`Expected success, got: ${either.message}`);

        expect(either.data.tokens).toBe(7);

        const saved = await getUserModel().findById(user._id).lean();
        expect(saved!.tokens).toBe(7);
    });

    it('records a transaction message with the attendant name, date/time, and duration', async () => {
        const controller = new UserController();
        const mapped = controller.chargeToken.mapper({
            customerId: user._id,
            tokens: 3,
            attendantName: 'Dra. Ana Souza',
            durationMs: 5 * 60_000 + 32_000,
            endedAt: new Date('2026-01-01T10:01:05Z'),
        });
        await controller.chargeToken.exec({ traceId: TRACE, mapped });

        const transaction = await getTransactionModel().findOne({ userId: user._id }).lean();
        expect(transaction!.message).toContain('Dra. Ana Souza');
        expect(transaction!.message).toContain('5min 32s');
        expect(transaction!.message).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('allows the balance to go negative (charge exceeds balance)', async () => {
        const controller = new UserController();
        const mapped = controller.chargeToken.mapper({ customerId: user._id, tokens: 15, attendantName: 'Test Attendant', durationMs: 65_000, endedAt: new Date('2026-01-01T10:01:05Z') });
        const either = await controller.chargeToken.exec({ traceId: TRACE, mapped });

        if (!isSuccess(either)) throw new Error('Expected success');

        expect(either.data.tokens).toBe(-5);
    });

    it('notifies realtime with the updated user', async () => {
        const controller = new UserController();
        const mapped = controller.chargeToken.mapper({ customerId: user._id, tokens: 2, attendantName: 'Test Attendant', durationMs: 65_000, endedAt: new Date('2026-01-01T10:01:05Z') });
        await controller.chargeToken.exec({ traceId: TRACE, mapped });

        expect(notifyUserTokenChargedMock).toHaveBeenCalledWith(
            TRACE,
            expect.objectContaining({ _id: user._id, tokens: 8 }),
        );
    });

    it('returns 400 when the customer does not exist', async () => {
        const controller = new UserController();
        const mapped = controller.chargeToken.mapper({ customerId: '000000000000000000000000', tokens: 1, attendantName: 'Test Attendant', durationMs: 65_000, endedAt: new Date('2026-01-01T10:01:05Z') });
        const either = await controller.chargeToken.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns 400 when customerId is not a valid id', async () => {
        const controller = new UserController();
        const mapped = controller.chargeToken.mapper({ customerId: 'not-an-id', tokens: 1, attendantName: 'Test Attendant', durationMs: 65_000, endedAt: new Date('2026-01-01T10:01:05Z') });
        const either = await controller.chargeToken.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const controller = new UserController();
        const mapped = controller.chargeToken.mapper({ customerId: user._id, tokens: 1, attendantName: 'Test Attendant', durationMs: 65_000, endedAt: new Date('2026-01-01T10:01:05Z') });
        const either = await controller.chargeToken.exec({ traceId: TRACE, mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
