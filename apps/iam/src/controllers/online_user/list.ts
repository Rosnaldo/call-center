import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { getRedisClient } from '#redis/singleton';
import { IOnlineUserController } from './params';
import { IOnlineUser } from '#schemas/online_user/types';

type IOutput = IOnlineUserController['IList']['IOutput'];

const REDIS_KEY = 'online_users';

export class List {
    public static readonly classId = Symbol.for('Controller > OnlineUser > List');

    private constructor() {}

    static construir(classId: symbol): List {
        if (classId !== Symbol.for('Controller > OnlineUser')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new List();
    }

    public readonly get = async (): Promise<Either<IOutput>> => {
        try {
            const redis = getRedisClient();
            const values = await redis.hvals(REDIS_KEY);
            const users: IOnlineUser['IParams'][] = values.map((v) => JSON.parse(v));
            return successData({ users });
        } catch (error: unknown) {
            return logError(error, '/online-users/list');
        }
    };
}
