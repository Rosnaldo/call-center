import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { toUndefined } from '#utils/mapper/to_undefined';
import { validateInput } from 'src/validations/online_user/add';
import { IOnlineUserController } from './params';

type IInput = IOnlineUserController['IAdd']['IInput'];
type IOutput = IOnlineUserController['IAdd']['IOutput'];

const REDIS_KEY = 'online_users';

interface Props {
    mapped: IInput;
}

export class Add {
    public static readonly classId = Symbol.for('Controller > OnlineUser > Add');

    private constructor() {}

    static construir(classId: symbol): Add {
        if (classId !== Symbol.for('Controller > OnlineUser')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Add();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const params = this.transform(props.mapped);
            const redis = getRedisClient();
            await redis.hset(REDIS_KEY, params.id, JSON.stringify(params));
            return successData(params);
        } catch (error: unknown) {
            return logError(error, '/online-users/add');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => {
        const { id, name, avatarUrl, status, isOnline } = body;
        return {
            id: mapString(id),
            name: mapString(name),
            avatarUrl: toUndefined('avatarUrl', avatarUrl),
            status: mapString(status) as IInput['status'],
            isOnline: typeof isOnline === 'boolean' ? isOnline : undefined,
        };
    };

    public readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
