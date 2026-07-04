import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { getUserModel, getCallHistoryModel } from '#models/singleton';
import { UserUtils } from '#schemas/user/utils';
import { CallState, IOnlineUser, getCallElapsedMs, computeTokensToBeCharged } from '@repo/shared-types';
import { notifyCallCompleted, notifyUserTokenCharged } from 'src/services/realtime';
import { ICallController } from './params';

const CALLS_KEY = 'calls';
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
    private readonly userUtils: UserUtils;

    private constructor() {
        this.userUtils = new UserUtils();
    }

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

            const callKey = `${CALLS_KEY}:${customerId}--${attendantId}`;
            const callJson = await redis.get(callKey);
            if (!callJson) throw new BadRequestException('Call não encontrada');
            const call = JSON.parse(callJson) as CallState;

            const elapsedMs = getCallElapsedMs(call);
            const tokensToBeCharged = computeTokensToBeCharged(elapsedMs);

            if (tokensToBeCharged > 0) {
                const user = await getUserModel().findById(customerId);
                if (!user) throw new BadRequestException('Cliente não encontrado');
                user.tokens = (user.tokens ?? 0) - tokensToBeCharged;
                await user.save();
                notifyUserTokenCharged(traceId, this.userUtils.toObject(user)).catch(() => {});
            }

            const endedCall: CallState = {
                ...call,
                accumulatedMs: elapsedMs,
                overlapStartedAt: null,
                isPlaying: false,
                endedAt: new Date(),
                tokensToBeCharged,
            };

            await getCallHistoryModel().create({
                callId: endedCall.id,
                customerId: endedCall.customerId,
                customerName: endedCall.customerName,
                attendantId: endedCall.attendantId,
                attendantName: endedCall.attendantName,
                roomName: endedCall.roomName,
                meetingId: endedCall.meetingId,
                accumulatedMs: endedCall.accumulatedMs,
                startedAt: endedCall.startedAt,
                endedAt: endedCall.endedAt,
                tokensToBeCharged: endedCall.tokensToBeCharged,
            });

            await redis.del(callKey);

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

            await notifyCallCompleted(traceId, customerId, attendantId);

            return successData(endedCall);
        } catch (error: unknown) {
            return logError(error, '/calls/complete');
        }
    };

    public readonly mapper = (body: Request['body']): CompleteInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
    });
}
