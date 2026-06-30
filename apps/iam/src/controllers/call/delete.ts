import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
const CALLS_KEY = 'calls';

interface DeleteInput {
    customerId: string;
    attendantId: string;
}

interface Props {
    mapped: DeleteInput;
}

export class Delete {
    public static readonly classId = Symbol.for('Controller > Call > Delete');

    private constructor() {}

    static construir(classId: symbol): Delete {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Delete();
    }

    public readonly exec = async (props: Props): Promise<Either<{}>> => {
        try {
            const { customerId, attendantId } = props.mapped;
            logger.info({ customerId, attendantId }, 'call delete');
            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');

            const key = `${CALLS_KEY}:${customerId}--${attendantId}`;
            const redis = getRedisClient();
            await redis.del(key);
            return successData({});
        } catch (error: unknown) {
            return logError(error, '/calls/delete');
        }
    };

    public readonly mapper = (body: Request['body']): DeleteInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
    });
}
