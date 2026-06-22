import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { CallState } from '@repo/shared-types';
import { ICallController } from './params';

type IInput = ICallController['IUpdate']['IInput'];
type IOutput = ICallController['IUpdate']['IOutput'];

const REDIS_KEY = 'calls';

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
            const { id, updates } = props.mapped;
            if (!id) throw new BadRequestException('id é obrigatório');

            const redis = getRedisClient();
            const existing = await redis.hget(REDIS_KEY, id);
            if (!existing) throw new BadRequestException('Call não encontrada');

            const call = JSON.parse(existing) as CallState;
            const updated = { ...call, ...updates, id };
            await redis.hset(REDIS_KEY, id, JSON.stringify(updated));

            return successData(updated);
        } catch (error: unknown) {
            return logError(error, '/calls/update');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        id: mapString(body.id),
        updates: body.updates ?? {},
    });
}
