import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { CallState } from '@repo/shared-types';
import { ICallController } from './params';

type IOutput = ICallController['IGet']['IOutput'];

const REDIS_KEY = 'calls';

interface Props {
    id: string;
}

export class Get {
    public static readonly classId = Symbol.for('Controller > Call > Get');

    private constructor() {}

    static construir(classId: symbol): Get {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Get();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { id } = props;
            if (!id) throw new BadRequestException('id é obrigatório');

            const redis = getRedisClient();
            const existing = await redis.hget(REDIS_KEY, id);
            if (!existing) throw new BadRequestException('Call não encontrada');

            return successData(JSON.parse(existing) as CallState);
        } catch (error: unknown) {
            return logError(error, '/calls/get');
        }
    };

    public readonly mapper = (query: Request['query']): Props => ({
        id: mapString(query.id as string),
    });
}
