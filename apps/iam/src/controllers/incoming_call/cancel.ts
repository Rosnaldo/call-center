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
            logger.info({ customerId: props.mapped.customerId, attendantId: props.mapped.attendantId }, 'incoming call cancel');
            const { customerId, attendantId } = this.transform(props.mapped);
            const redis = getRedisClient();

            await redis.del(`${INCOMING_CALL_PREFIX}${attendantId}`);

            const callKey = `${CALLS_KEY}:${customerId}--${attendantId}`;
            const existingCall = await redis.get(callKey);

            if (existingCall) {
                await redis.del(callKey);
            }

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

            notifyIncomingCallCancelled(customerId, attendantId).catch(() => {});

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
