import { mockUser } from '../../entities/schemas/user/mock';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { IUser } from 'src/entities/schemas/user/types';
import { validateOutput } from 'src/validations/user/paginacao';
import { UserController } from 'src/controllers/user';
import { PaginateResponse } from 'src/types';

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

describe('Controller > User > Paginacao', () => {
    it('validate output', async () => {
        const params = {
            page: 1,
            pageSize: 10,
            isPagination: true,
        };

        const controller = new UserController();
        const mapped = controller.paginacao.mapper(params);
        const either = await controller.paginacao.get({ user, params: mapped });

        const result = either as PaginateResponse<IUser['IParams']>;
        if (result.isError) {
            throw new Error('Should not throw error');
        }

        const zodResult = validateOutput(result);
        expect(zodResult.hasError).toBeFalsy();
    });
});
