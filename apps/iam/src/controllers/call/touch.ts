import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { CALL_TTL_SECONDS } from '#const/redis_ttl';
import { ICallController } from './params';

type IInput = ICallController['ITouch']['IInput'];

const CALLS_KEY = 'calls';

interface Props {
    mapped: IInput;
}

// Refreshes the TTL on an existing call without a read-modify-write. Used by
// /calls/sync, which (unlike onMeetingStarted/update_participant) has no
// other reason to write the record when it's just confirming presence.
export class Touch {
    public static readonly classId = Symbol.for('Controller > Call > Touch');

    private constructor() {}

    static construir(classId: symbol): Touch {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Touch();
    }

    public readonly exec = async (props: Props): Promise<Either<{}>> => {
        try {
            const { customerId, attendantId } = props.mapped;
            logger.info({ customerId, attendantId }, 'call touch');
            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');

            const key = `${CALLS_KEY}:${customerId}--${attendantId}`;
            const redis = getRedisClient();
            const touched = await redis.expire(key, CALL_TTL_SECONDS);
            if (!touched) throw new BadRequestException('Call não encontrada');

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/calls/touch');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
    });
}
