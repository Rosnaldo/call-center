import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { CallState } from '@repo/shared-types';
import { ICallController } from './params';

type IInput = ICallController['IUpdate']['IInput'];
type IOutput = ICallController['IUpdate']['IOutput'];

const CALLS_KEY = 'calls';

interface Props {
    mapped: IInput;
}

export class Update {
    public static readonly classId = Symbol.for('Controller > Call > Update');

    private constructor() {}

    static construir(classId: symbol): Update {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Update();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { customerId, attendantId, updates } = props.mapped;
            logger.info({ customerId, attendantId }, 'call update');
            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');

            const key = `${CALLS_KEY}:${customerId}--${attendantId}`;
            const redis = getRedisClient();
            const existing = await redis.get(key);
            if (!existing) throw new BadRequestException('Call não encontrada');

            const call = JSON.parse(existing) as CallState;
            const updated = { ...call, ...updates };
            await redis.set(key, JSON.stringify(updated));

            return successData(updated);
        } catch (error: unknown) {
            return logError(error, '/calls/update');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
        updates: body.updates ?? {},
    });
}
