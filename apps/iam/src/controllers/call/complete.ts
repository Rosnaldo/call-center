import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { IOnlineUser } from '@repo/shared-types';
import { notifyCallCompleted } from 'src/services/realtime';
import { ICallController } from './params';

const ONLINE_USERS_PREFIX = 'online_user:';

type IOutput = ICallController['IComplete']['IOutput'];

interface CompleteInput {
    customerId: string;
    attendantId: string;
}

interface Props {
    traceId: string;
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

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            const { customerId, attendantId } = props.mapped;
            logger.info({ customerId, attendantId }, 'call complete');
            if (!customerId || !attendantId) throw new BadRequestException('customerId e attendantId são obrigatórios');

            const redis = getRedisClient();

            const [customerJson, attendantJson] = await Promise.all([
                redis.get(`${ONLINE_USERS_PREFIX}${customerId}`),
                redis.get(`${ONLINE_USERS_PREFIX}${attendantId}`),
            ]);

            if (!customerJson) throw new BadRequestException('Cliente não encontrado.');
            if (!attendantJson) throw new BadRequestException('Atendente não encontrado.');

            const customer = JSON.parse(customerJson) as IOnlineUser;
            const attendant = JSON.parse(attendantJson) as IOnlineUser;

            await redis.set(`${ONLINE_USERS_PREFIX}${customer.id}`, JSON.stringify({ ...customer, status: 'idle' }), 'EX', 90);
            await redis.set(`${ONLINE_USERS_PREFIX}${attendant.id}`, JSON.stringify({ ...attendant, status: 'idle' }), 'EX', 90);

            const roomName = `${customer.slug}--${attendant.slug}`;
            await notifyCallCompleted(traceId, customerId, attendantId, roomName);

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
