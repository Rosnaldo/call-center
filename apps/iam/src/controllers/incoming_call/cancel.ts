import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput, ICancelInput } from 'src/validations/incoming_call/cancel';
import { IOnlineUser, CallState } from '@repo/shared-types';
import { notifyIncomingCallCancelled } from 'src/services/realtime';

const INCOMING_CALL_PREFIX = 'incoming_call:';
const CALLS_KEY = 'calls';
const ONLINE_USERS_PREFIX = 'online_user:';

interface Props {
    traceId: string;
    mapped: ICancelInput;
}

export class Cancel {
    public static readonly classId = Symbol.for('Controller > IncomingCall > Cancel');

    private constructor() {}

    static construir(classId: symbol): Cancel {
        if (classId !== Symbol.for('Controller > IncomingCall')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Cancel();
    }

    public readonly exec = async (props: Props): Promise<Either<{}>> => {
        try {
            const { traceId } = props;
            logger.info({ customerId: props.mapped.customerId, attendantId: props.mapped.attendantId }, 'incoming call cancel');
            const { customerId, attendantId } = this.transform(props.mapped);
            const redis = getRedisClient();

            const callKey = `${CALLS_KEY}:${customerId}--${attendantId}`;

            const [customerJson, attendantJson, existingCall] = await Promise.all([
                redis.get(`${ONLINE_USERS_PREFIX}${customerId}`),
                redis.get(`${ONLINE_USERS_PREFIX}${attendantId}`),
                redis.get(callKey),
            ]);

            if (!customerJson) throw new BadRequestException('Cliente não encontrado.');
            if (!attendantJson) throw new BadRequestException('Atendente não encontrado.');

            const customer = JSON.parse(customerJson) as IOnlineUser;
            const attendant = JSON.parse(attendantJson) as IOnlineUser;

            await redis.del(`${INCOMING_CALL_PREFIX}${attendantId}`);

            if (existingCall) {
                await redis.del(callKey);
            }

            await redis.set(`${ONLINE_USERS_PREFIX}${customer.id}`, JSON.stringify({ ...customer, status: 'idle' }), 'EX', 90);
            await redis.set(`${ONLINE_USERS_PREFIX}${attendant.id}`, JSON.stringify({ ...attendant, status: 'idle' }), 'EX', 90);

            notifyIncomingCallCancelled(traceId, customerId, attendantId).catch(() => {});

            return successData({});
        } catch (error: unknown) {
            return logError(error, '/incoming-calls/cancel');
        }
    };

    public readonly mapper = (body: Request['body']): ICancelInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
    });

    private readonly transform = (mapped: ICancelInput): ICancelInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as ICancelInput;
    };
}
