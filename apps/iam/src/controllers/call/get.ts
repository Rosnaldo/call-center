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
    customerId: string;
    attendantId: string;
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
            const { customerId, attendantId } = props;
            logger.info({ customerId, attendantId }, 'call get');
            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');

            const key = `${CALLS_KEY}:${customerId}--${attendantId}`;
            const redis = getRedisClient();
            const existing = await redis.get(key);
            if (!existing) throw new BadRequestException('Call não encontrada');

            return successData(JSON.parse(existing) as CallState);
        } catch (error: unknown) {
            return logError(error, '/calls/get');
        }
    };

    public readonly mapper = (query: Request['query']): Props => ({
        customerId: mapString(query.customerId as string),
        attendantId: mapString(query.attendantId as string),
    });
}
