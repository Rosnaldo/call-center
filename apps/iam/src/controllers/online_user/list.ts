import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { getRedisClient } from '#redis/singleton';
import { IOnlineUserController } from './params';
import { IOnlineUser } from '#schemas/online_user/types';

type IOutput = IOnlineUserController['IList']['IOutput'];

const REDIS_PREFIX = 'online_user:';

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
            const keys = await redis.keys(`${REDIS_PREFIX}*`);
            if (keys.length === 0) return successData({ users: [] });
            const values = await redis.mget(...keys);
            const users: IOnlineUser['IParams'][] = values
                .filter((v): v is string => v !== null)
                .map((v) => JSON.parse(v));
            return successData({ users });
        } catch (error: unknown) {
            return logError(error, '/online-users/list');
        }
    };
}
