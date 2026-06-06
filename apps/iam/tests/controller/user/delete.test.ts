import { mockUser } from '../../entities/schemas/user/mock';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { IUser } from 'src/entities/schemas/user/types';
import { UserController } from 'src/controllers/user';
import { UserRole } from '@repo/shared-types';
import { isSuccess } from 'src/utils/either';
import { getUserModel } from 'src/entities/models/singleton';
import { getKcMain } from 'src/keycloak/singleton';

jest.mock('src/keycloak/singleton', () => ({
    getKcMain: jest.fn(),
    buildKcMain: jest.fn().mockResolvedValue({}),
}));

const mockDel = jest.fn().mockResolvedValue(undefined);

let adminUser: IUser['IParams'];

beforeAll(async () => {
    (getKcMain as jest.Mock).mockReturnValue({
        getKcClientCredentials: jest.fn().mockResolvedValue({
            users: {
                create: jest.fn().mockResolvedValue({}),
                find: jest.fn().mockResolvedValue([{ id: 'mock-kc-user-id' }]),
                del: mockDel,
                update: jest.fn().mockResolvedValue(undefined),
            },
        }),
    });

    await mongooseBootstrap();
    adminUser = await mockUser({ init: { role: UserRole.admin } }).save();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

describe('Controller > User > Delete', () => {
    it('deletes user from the database and validates output', async () => {
        const target = await mockUser().save();

        const body = { _id: target._id };
        const controller = new UserController();
        const mapped = controller.delete.mapper(body);
        const either = await controller.delete.exec({ mapped, userSource: adminUser });

        if (!isSuccess(either)) throw new Error('Should not return error');

        const deleted = await getUserModel().findById(target._id).lean();

        expect(deleted).toBeNull();
    });

    it('returns error when non-admin tries to delete another user', async () => {
        const target = await mockUser().save();
        const requester = await mockUser({ init: { role: UserRole.customer } }).save();

        const body = { _id: target._id };
        const controller = new UserController();
        const mapped = controller.delete.mapper(body);
        const either = await controller.delete.exec({ mapped, userSource: requester });

        expect(either.isError).toBe(true);
    });

    it('allows non-admin to delete their own account', async () => {
        const requester = await mockUser({ init: { role: UserRole.customer } }).save();

        const body = { _id: requester._id };
        const controller = new UserController();
        const mapped = controller.delete.mapper(body);
        const either = await controller.delete.exec({ mapped, userSource: requester });

        if (!isSuccess(either)) throw new Error('Should not return error');

        const deleted = await getUserModel().findById(requester._id).lean();
        expect(deleted).toBeNull();
    });
});
