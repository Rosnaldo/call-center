import { connectRedis, getRedisClient, disconnectRedis } from 'src/redis/singleton';
import { OnlineUserController } from 'src/controllers/online_user';
import { isSuccess } from 'src/utils/either';
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

describe('Controller > OnlineUser > Remove', () => {
    it('removes the user from redis', async () => {
        const user = mockOnlineUser();
        const redis = getRedisClient();
        await redis.hset('online_users', user.id, JSON.stringify(user));

        const controller = new OnlineUserController();
        const mapped = controller.remove.mapper({ id: user.id });
        const either = await controller.remove.exec({ mapped });

        expect(isSuccess(either)).toBe(true);

        const stored = await redis.hget('online_users', user.id);
        expect(stored).toBeNull();
    });

    it('does not remove other users', async () => {
        const user1 = mockOnlineUser();
        const user2 = mockOnlineUser();
        const redis = getRedisClient();
        await redis.hset('online_users', user1.id, JSON.stringify(user1));
        await redis.hset('online_users', user2.id, JSON.stringify(user2));

        const controller = new OnlineUserController();
        const mapped = controller.remove.mapper({ id: user1.id });
        await controller.remove.exec({ mapped });

        const stored = await redis.hget('online_users', user2.id);
        expect(stored).not.toBeNull();
    });

    it('succeeds even when user does not exist', async () => {
        const controller = new OnlineUserController();
        const mapped = controller.remove.mapper({ id: 'nonexistent' });
        const either = await controller.remove.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });

    it('returns 400 when id is missing', async () => {
        const controller = new OnlineUserController();
        const mapped = controller.remove.mapper({});
        const either = await controller.remove.exec({ mapped });

        expect(either.isError).toBe(true);
        expect(either.status).toBe(400);
    });

    it('returns isError false and status 200 on success', async () => {
        const user = mockOnlineUser();
        const redis = getRedisClient();
        await redis.hset('online_users', user.id, JSON.stringify(user));

        const controller = new OnlineUserController();
        const mapped = controller.remove.mapper({ id: user.id });
        const either = await controller.remove.exec({ mapped });

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
