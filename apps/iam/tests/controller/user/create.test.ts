import Chance from 'chance';

import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { UserController } from 'src/controllers/user';
import { UserRole } from '@repo/shared-types';
import { isSuccess } from 'src/utils/either';
import { getUserModel } from 'src/entities/models/singleton';
import { validateOutput } from 'src/validations/user/create';

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

const chance = new Chance();

beforeAll(async () => {
    await mongooseBootstrap();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

describe('Controller > User > Create', () => {
    it('persists the user in the database with the correct fields', async () => {
        const body = {
            firstName: chance.first(),
            lastName: chance.last(),
            email: chance.email(),
            role: UserRole.customer,
        };

        const controller = new UserController();
        const mapped = controller.create.mapper(body);
        const either = await controller.create.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Should not return error');

        const saved = await getUserModel().findById(either.data._id).lean();

        expect(saved).not.toBeNull();
        expect(saved!.firstName).toBe(body.firstName);
        expect(saved!.lastName).toBe(body.lastName);
        expect(saved!.email).toBe(body.email);
        expect(saved!.role).toBe(body.role);

        const zodResult = validateOutput(either.data);
        expect(zodResult.hasError).toBeFalsy();
    });
});
