import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput, IRemoveInput } from 'src/validations/online_user/remove';

const REDIS_PREFIX = 'online_user:';

interface Props {
    mapped: IRemoveInput;
}

export class Remove {
    public static readonly classId = Symbol.for('Controller > OnlineUser > Remove');

    private constructor() {}

    static construir(classId: symbol): Remove {
        if (classId !== Symbol.for('Controller > OnlineUser')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Remove();
    }

    public readonly exec = async (props: Props): Promise<Either<{}>> => {
        try {
            const { id } = this.transform(props.mapped);
            const redis = getRedisClient();
            await redis.del(`${REDIS_PREFIX}${id}`);
            return successData({});
        } catch (error: unknown) {
            return logError(error, '/online-users/remove');
        }
    };

    public readonly mapper = (body: Request['body']): IRemoveInput => ({
        id: mapString(body.id),
    });

    private readonly transform = (mapped: IRemoveInput): IRemoveInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as IRemoveInput;
    };
}
