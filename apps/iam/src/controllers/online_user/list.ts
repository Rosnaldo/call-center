import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { getOnlineUsersList } from 'src/services/online_users_list';
import { IOnlineUserController } from './params';

type IOutput = IOnlineUserController['IList']['IOutput'];

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
            logger.info('online user list');
            const users = await getOnlineUsersList();
            return successData({ users });
        } catch (error: unknown) {
            return logError(error, '/online-users/list');
        }
    };
}
