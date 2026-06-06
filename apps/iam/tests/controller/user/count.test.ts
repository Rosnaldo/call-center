import { mockUser } from '../../entities/schemas/user/mock';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { UserController } from 'src/controllers/user';
import { UserRole } from '@repo/shared-types';
import { isSuccess } from 'src/utils/either';
import { validateOutput } from 'src/validations/user/count';

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

describe('Controller > User > Count', () => {
    it('returns success with admins, customers and attendants as numbers', async () => {
        const controller = new UserController();
        const either = await controller.count.get();

        if (!isSuccess(either)) throw new Error('Should not return error');

        expect(typeof either.data.admins).toBe('number');
        expect(typeof either.data.customers).toBe('number');
        expect(typeof either.data.attendants).toBe('number');
    });

    it('reflects newly created users in the count', async () => {
        const controller = new UserController();

        const before = await controller.count.get();
        if (!isSuccess(before)) throw new Error('Should not return error');

        await mockUser({ init: { role: UserRole.admin } }).save();
        await mockUser({ init: { role: UserRole.customer } }).save();
        await mockUser({ init: { role: UserRole.customer } }).save();

        const after = await controller.count.get();
        if (!isSuccess(after)) throw new Error('Should not return error');

        expect(after.data.admins).toBe(before.data.admins + 1);
        expect(after.data.customers).toBe(before.data.customers + 2);

        const zodResult = validateOutput(after.data);
        expect(zodResult.hasError).toBeFalsy();
    });

    it('returns isError false and status 200', async () => {
        const controller = new UserController();
        const either = await controller.count.get();

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
