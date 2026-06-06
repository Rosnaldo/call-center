import { mockUser } from '../../entities/schemas/user/mock';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { IUser } from 'src/entities/schemas/user/types';
import { validateOutput } from 'src/validations/user/find-by-email';
import { UserController } from 'src/controllers/user';
import { isSuccess } from 'src/utils/either';

let user: IUser['IParams'];

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
    const builder = mockUser();
    user = await builder.save();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

describe('Controller > User > FindByEmail', () => {
    it('validate output', async () => {
        const params = {
            email: user.email,
        };

        const controller = new UserController();
        const mapped = controller.byEmail.mapper(params);
        const either = await controller.byEmail.get({ params: mapped });

        if (isSuccess(either)) {
            const zodResult = validateOutput(either.data);
            expect(zodResult.hasError).toBeFalsy();
        } else {
            throw new Error('Should not throw error');
        }
    });
});
