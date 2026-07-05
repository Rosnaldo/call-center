import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { CallState } from '@repo/shared-types';
import { ICallController } from './params';

type IOutput = ICallController['IGet']['IOutput'];

const CALLS_KEY = 'calls';

interface Props {
    userId: string;
}

export class GetByUser {
    public static readonly classId = Symbol.for('Controller > Call > GetByUser');

    private constructor() {}

    static construir(classId: symbol): GetByUser {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new GetByUser();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { userId } = props;
            logger.info({ userId }, 'call get by user');
            if (!userId) throw new BadRequestException('userId é obrigatório');

            const redis = getRedisClient();
            const keys = await redis.keys(`${CALLS_KEY}:*`);
            if (keys.length === 0) throw new BadRequestException('Call não encontrada');
            const values = await redis.mget(keys);
            const call = values
                .filter((v): v is string => v !== null)
                .map((v) => JSON.parse(v) as CallState)
                .find((c) => c.customerId === userId || c.attendantId === userId);

            if (!call) throw new BadRequestException('Call não encontrada');

            return successData(call);
        } catch (error: unknown) {
            return logError(error, '/calls/get-by-user');
        }
    };

    public readonly mapper = (query: Request['query']): Props => ({
        userId: mapString(query.userId as string),
    });
}
