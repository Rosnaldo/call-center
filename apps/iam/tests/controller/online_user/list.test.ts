import { getRedisClient } from 'src/redis/singleton';
import { OnlineUserController } from 'src/controllers/online_user';
import { isSuccess } from 'src/utils/either';
import { validateOutput } from 'src/validations/online_user/list';
import { mockOnlineUser } from '../../entities/schemas/online_user/mock';

jest.mock('src/redis/singleton', () => ({
    getRedisClient: jest.fn().mockReturnValue({
        hvals: jest.fn().mockResolvedValue([]),
    }),
}));

const hvals = () => (getRedisClient() as any).hvals as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    hvals().mockResolvedValue([]);
});

describe('Controller > OnlineUser > List', () => {
    it('returns empty list when redis is empty', async () => {
        const controller = new OnlineUserController();
        const either = await controller.list.get();

        if (!isSuccess(either)) throw new Error('Should not return error');

        expect(either.data.users).toEqual([]);
    });

    it('returns stored users parsed from redis', async () => {
        const user1 = mockOnlineUser();
        const user2 = mockOnlineUser({ init: { status: 'in-call' } });
        hvals().mockResolvedValue([JSON.stringify(user1), JSON.stringify(user2)]);

        const controller = new OnlineUserController();
        const either = await controller.list.get();

        if (!isSuccess(either)) throw new Error('Should not return error');

        expect(either.data.users).toHaveLength(2);
        expect(either.data.users[0].id).toBe(user1.id);
        expect(either.data.users[1].id).toBe(user2.id);
    });

    it('output passes schema validation', async () => {
        const user = mockOnlineUser();
        hvals().mockResolvedValue([JSON.stringify(user)]);

        const controller = new OnlineUserController();
        const either = await controller.list.get();

        if (!isSuccess(either)) throw new Error('Should not return error');

        const zodResult = validateOutput(either.data);
        expect(zodResult.hasError).toBeFalsy();
    });

    it('returns isError false and status 200', async () => {
        const controller = new OnlineUserController();
        const either = await controller.list.get();

        expect(either.isError).toBe(false);
        expect(either.status).toBe(200);
    });
});
