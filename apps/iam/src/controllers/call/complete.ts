import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { CallState, IOnlineUser } from '@repo/shared-types';
import { notifyCallCompleted } from 'src/services/realtime';
import { ejectBothParticipantsFromRoom } from 'src/services/daily';
import { ICallController } from './params';

const ONLINE_USERS_PREFIX = 'online_user:';
const CALLS_KEY = 'calls';

type IOutput = ICallController['IComplete']['IOutput'];
type Redis = ReturnType<typeof getRedisClient>;

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

            // The call record's own TTL (2h) far outlives online_user's
            // (90s) 
            const callJson = await redis.get(`${CALLS_KEY}:${customerId}--${attendantId}`);
            if (!callJson) return successData({});
            const call = JSON.parse(callJson) as CallState;

            await Promise.all([
                this.markIdle(redis, customerId),
                this.markIdle(redis, attendantId),
            ]);

            await ejectBothParticipantsFromRoom(call.roomName);
            await notifyCallCompleted(traceId, customerId, attendantId, call.roomName);

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/calls/complete');
        }
    };

    public readonly mapper = (body: Request['body']): CompleteInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
    });

    private readonly markIdle = async (redis: Redis, userId: string): Promise<void> => {
        const key = `${ONLINE_USERS_PREFIX}${userId}`;
        const raw = await redis.get(key);
        if (!raw) return;

        const existing = JSON.parse(raw) as IOnlineUser;
        await redis.set(key, JSON.stringify({ ...existing, status: 'idle' }), 'EX', 90);
    };
}
