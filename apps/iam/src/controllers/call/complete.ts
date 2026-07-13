import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { CallState } from '@repo/shared-types';
import { CallStateBuilder } from '#schemas/call/utils';
import { notifyCallCompleted } from 'src/services/call_events';
import { ejectBothParticipantsFromRoom } from 'src/services/daily';
import { ICallController } from './params';
import { patchOnlineUserIfPresent } from 'src/interactors/online_user';

const CALLS_KEY = 'calls';

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

            // The call record's own TTL (2h) far outlives online_user's
            // (90s) 
            const callJson = await redis.get(`${CALLS_KEY}:${customerId}--${attendantId}`);
            if (!callJson) return successData({});
            const call = JSON.parse(callJson) as CallState;

            // Marks the record closed right away — the actual teardown (Daily
            // ejection below, then billing/history/deletion off Daily's own
            // meeting.ended webhook) can take a few seconds, and isClosed is
            // what lets every client show that transition instead of a stale
            // in-call screen in the meantime.
            const closedCall = await new CallStateBuilder(call).close().save();

            // Best-effort — the online_user cache entry may have already
            // expired (90s TTL) or been removed; that shouldn't block the
            // room ejection/notification below.
            try {
                await Promise.all([
                    patchOnlineUserIfPresent(customerId, { status: 'idle' }),
                    patchOnlineUserIfPresent(attendantId, { status: 'idle' }),
                ]);
            } catch (error) {
                logger.error({ traceId, error }, 'call complete: falha ao sincronizar cache de presença');
            }

            await ejectBothParticipantsFromRoom(closedCall.roomName);
            notifyCallCompleted(traceId, customerId, attendantId, closedCall);

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
