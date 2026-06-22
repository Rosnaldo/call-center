import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { OnlineUserController } from 'src/controllers/online_user';
import { isSuccess } from 'src/utils/either';
import { validateOutput } from 'src/validations/online_user/add';
import { mockOnlineUser } from '../../entities/schemas/online_user/mock';

beforeAll(async () => {
    await connectRedis();
});

afterAll(async () => {
    await disconnectRedis();
});

beforeEach(async () => {
    await getRedisClient().flushall();
});

describe('Controller > OnlineUser > Add', () => {
    it('stores the user in redis and returns it', async () => {
        const user = mockOnlineUser();
        const controller = new OnlineUserController();
        const mapped = controller.add.mapper(user);
        const either = await controller.add.exec({ mapped });

        if (!isSuccess(either)) throw new Error('Should not return error');

        expect(either.data.id).toBe(user.id);
        expect(either.data.name).toBe(user.name);
        expect(either.data.status).toBe(user.status);

        const redis = getRedisClient();
        const stored = await redis.hget('online_users', user.id);
        expect(stored).not.toBeNull();
        expect(JSON.parse(stored!).id).toBe(user.id);
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
        const mapped = controller.add.mapper({ name: 'Test', status: 'idle' });
        const either = await controller.add.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns error when status is invalid', async () => {
        const controller = new OnlineUserController();
        const mapped = controller.add.mapper({ id: 'user-1', name: 'Test', status: 'bad-status' });
        const either = await controller.add.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });
});
