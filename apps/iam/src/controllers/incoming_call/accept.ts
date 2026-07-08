import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { IIncomingCallController } from './params';
import { IncomingCallState, CallState, IOnlineUser } from '@repo/shared-types';
import { notifyCallAccepted } from 'src/services/realtime';
import { validateInput } from 'src/validations/incoming_call/accept';

type IInput = IIncomingCallController['IAccept']['IInput'];
type IOutput = IIncomingCallController['IAccept']['IOutput'];

const INCOMING_CALL_PREFIX = 'incoming_call:';
const CALLS_KEY = 'calls';
const ONLINE_USERS_PREFIX = 'online_user:';

interface Props {
    traceId: string;
    mapped: IInput;
}

export class Accept {
    public static readonly classId = Symbol.for('Controller > IncomingCall > Accept');

    private constructor() {}

    static construir(classId: symbol): Accept {
        if (classId !== Symbol.for('Controller > IncomingCall')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Accept();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            logger.info({ attendantId: props.mapped.attendantId, userId: props.mapped.userId }, 'incoming call accept');
            const { attendantId, userId } = this.transform(props.mapped);
            const redis = getRedisClient();

            const existing = await redis.get(`${INCOMING_CALL_PREFIX}${attendantId}`);
            if (!existing) throw new BadRequestException('Incomingcall não existe');

            const incomingCall = JSON.parse(existing) as IncomingCallState;

            if (userId === incomingCall.customerId) {
                throw new BadRequestException('Customer não deve atender ligação');
            }

            const callKey = `${CALLS_KEY}:${incomingCall.customerId}--${incomingCall.attendantId}`;

            const [customerJson, attendantJson, existingCall] = await Promise.all([
                redis.get(`${ONLINE_USERS_PREFIX}${incomingCall.customerId}`),
                redis.get(`${ONLINE_USERS_PREFIX}${incomingCall.attendantId}`),
                redis.get(callKey),
            ]);

            if (!customerJson) throw new BadRequestException('Cliente não encontrado.');
            if (!attendantJson) throw new BadRequestException('Atendente não encontrado.');

            const customer = JSON.parse(customerJson) as IOnlineUser;
            const attendant = JSON.parse(attendantJson) as IOnlineUser;

            if (!existingCall) {
                const newCall: CallState = {
                    id: `${incomingCall.customerId}--${incomingCall.attendantId}`,
                    customerId: incomingCall.customerId,
                    customerName: customer.name,
                    attendantId: incomingCall.attendantId,
                    attendantName: attendant.name,
                    roomName: `${customer.slug}--${attendant.slug}`,
                    activeUserIds: [],
                    accumulatedMs: 0,
                    overlapStartedAt: null,
                    startedAt: null,
                    endedAt: null,
                    isPlaying: false,
                    tokensToBeCharged: 0,
                };
                await redis.set(callKey, JSON.stringify(newCall));
            }

            await redis.del(`${INCOMING_CALL_PREFIX}${attendantId}`);

            await redis.set(`${ONLINE_USERS_PREFIX}${customer.id}`, JSON.stringify({ ...customer, status: 'in-call' }), 'EX', 90);
            await redis.set(`${ONLINE_USERS_PREFIX}${attendant.id}`, JSON.stringify({ ...attendant, status: 'in-call' }), 'EX', 90);

            notifyCallAccepted(traceId, incomingCall.customerId, incomingCall.attendantId, incomingCall.calledBy, incomingCall).catch(() => {});

            return successData(incomingCall);
        } catch (error: unknown) {
            return logError(error, '/incoming-calls/accept');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        attendantId: mapString(body.attendantId),
        userId: mapString(body.userId),
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as IInput;
    };
}
