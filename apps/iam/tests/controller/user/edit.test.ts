import Chance from 'chance';

import { mockUser } from '../../entities/schemas/user/mock';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { UserController } from 'src/controllers/user';
import { UserRole } from '@repo/shared-types';
import { isSuccess } from 'src/utils/either';
import { IUser } from 'src/entities/schemas/user/types';
import { validateOutput } from 'src/validations/user/edit';
import { getUserModel } from 'src/entities/models/singleton';

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
let user: IUser['IParams'];

beforeAll(async () => {
    await mongooseBootstrap();
    const builder = mockUser();
    user = await builder.save();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

describe('Controller > User > Edicao', () => {
    it('updates user and validates output', async () => {
        const body = {
            _id: user._id,
            firstName: chance.first(),
            lastName: chance.last(),
        };

        const adminUser: IUser['IParams'] = { ...user, role: UserRole.admin };
        const controller = new UserController();
        const mapped = controller.edit.mapper(body);
        const either = await controller.edit.exec({ mapped, userSource: adminUser });

        if (!isSuccess(either)) throw new Error('Should not return error');

        const saved = await getUserModel().findById(user._id).lean();
        expect(saved!.firstName).toBe(body.firstName);
        expect(saved!.lastName).toBe(body.lastName);


        const zodResult = validateOutput(either.data);
        expect(zodResult.hasError).toBeFalsy();
    });

    it('updates user update email and role', async () => {
        const body = {
            _id: user._id,
            email: chance.email(),
            role: UserRole.admin,
        };

        const adminUser: IUser['IParams'] = { ...user, role: UserRole.admin };
        const controller = new UserController();
        const mapped = controller.edit.mapper(body);
        const either = await controller.edit.exec({ mapped, userSource: adminUser });

        if (!isSuccess(either)) throw new Error('Should not return error');

        const saved = await getUserModel().findById(user._id).lean();
        expect(saved!.email).toBe(body.email);
        expect(saved!.role).toBe(body.role);


        const zodResult = validateOutput(either.data);
        expect(zodResult.hasError).toBeFalsy();
    });
});
