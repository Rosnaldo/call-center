import { getRedisClient } from 'src/redis/singleton';
import { OnlineUserController } from 'src/controllers/online_user';
import { isSuccess } from 'src/utils/either';
import { validateOutput } from 'src/validations/online_user/add';
import { mockOnlineUser } from '../../entities/schemas/online_user/mock';

jest.mock('src/redis/singleton', () => ({
    getRedisClient: jest.fn().mockReturnValue({
        hset: jest.fn().mockResolvedValue(1),
        hvals: jest.fn().mockResolvedValue([]),
    }),
}));

const redisClient = () => getRedisClient() as jest.Mocked<ReturnType<typeof getRedisClient>>;

beforeEach(() => {
    jest.clearAllMocks();
    (redisClient().hset as jest.Mock).mockResolvedValue(1);
});

describe('Controller > OnlineUser > Add', () => {
    it('stores the user in redis and returns it', async () => {
        const user = mockOnlineUser();
        const controller = new OnlineUserController();
        const mapped = controller.add.mapper(user);
        const either = await controller.add.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Should not return error');

        expect(redisClient().hset).toHaveBeenCalledWith('online_users', user.id, JSON.stringify(user));
        expect(either.data.id).toBe(user.id);
        expect(either.data.name).toBe(user.name);
        expect(either.data.status).toBe(user.status);
    });

    it('output passes schema validation', async () => {
        const user = mockOnlineUser();
        const controller = new OnlineUserController();
        const mapped = controller.add.mapper(user);
        const either = await controller.add.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Should not return error');

        const zodResult = validateOutput(either.data);
        expect(zodResult.hasError).toBeFalsy();
    });

    it('returns isError false and status 200', async () => {
        const user = mockOnlineUser();
        const controller = new OnlineUserController();
        const mapped = controller.add.mapper(user);
        const either = await controller.add.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });

    it('returns error when id is missing', async () => {
        const controller = new OnlineUserController();
        const either = await controller.add.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns error when status is invalid', async () => {
        const controller = new OnlineUserController();
        const either = await controller.add.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
