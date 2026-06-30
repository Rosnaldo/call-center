import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { IOnlineUser } from '@repo/shared-types';
import { notifyCallCompleted } from 'src/services/realtime';

const CALLS_KEY = 'calls';
const ONLINE_USERS_PREFIX = 'online_user:';

interface CompleteInput {
    customerId: string;
    attendantId: string;
}

interface Props {
    mapped: CompleteInput;
}

export class Complete {
    public static readonly classId = Symbol.for('Controller > Call > Complete');

    private constructor() {}

    static construir(classId: symbol): Complete {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Complete();
    }

    public readonly exec = async (props: Props): Promise<Either<{}>> => {
        try {
            const { customerId, attendantId } = props.mapped;
            logger.info({ customerId, attendantId }, 'call complete');
            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');

            const redis = getRedisClient();

            const callKey = `${CALLS_KEY}:${customerId}--${attendantId}`;
            await redis.del(callKey);

            const customerJson = await redis.get(`${ONLINE_USERS_PREFIX}${customerId}`);
            if (customerJson) {
                const customer = JSON.parse(customerJson) as IOnlineUser;
                await redis.set(`${ONLINE_USERS_PREFIX}${customer.id}`, JSON.stringify({ ...customer, status: 'idle' }), 'EX', 90);
            }

            const attendantJson = await redis.get(`${ONLINE_USERS_PREFIX}${attendantId}`);
            if (attendantJson) {
                const attendant = JSON.parse(attendantJson) as IOnlineUser;
                await redis.set(`${ONLINE_USERS_PREFIX}${attendant.id}`, JSON.stringify({ ...attendant, status: 'idle' }), 'EX', 90);
            }

            notifyCallCompleted(customerId, attendantId).catch(() => {});

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/calls/complete');
        }
    };

    public readonly mapper = (body: Request['body']): CompleteInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
    });
}
