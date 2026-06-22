import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput, ICancelInput } from 'src/validations/incoming_call/cancel';
import { IOnlineUser, CallState } from '@repo/shared-types';
import { realtimeApi } from '#apis/realtime';

const INCOMING_CALL_KEY = 'incoming_calls';
const CALLS_KEY = 'calls';
const ONLINE_USERS_KEY = 'online_users';

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
            const { customerId, attendantId } = this.transform(props.mapped);
            const redis = getRedisClient();

            await redis.hdel(INCOMING_CALL_KEY, attendantId);

            const allCalls = await redis.hvals(CALLS_KEY);
            const call = allCalls
                .map((v) => JSON.parse(v) as CallState)
                .find((c) => c.customerId === customerId && c.attendantId === attendantId);

            if (call) {
                await redis.hdel(CALLS_KEY, call.id);
            }

            const customerJson = await redis.hget(ONLINE_USERS_KEY, customerId);
            if (customerJson) {
                const customer = JSON.parse(customerJson) as IOnlineUser;
                await redis.hset(ONLINE_USERS_KEY, customer.id, JSON.stringify({ ...customer, status: 'idle' }));
            }

            const attendantJson = await redis.hget(ONLINE_USERS_KEY, attendantId);
            if (attendantJson) {
                const attendant = JSON.parse(attendantJson) as IOnlineUser;
                await redis.hset(ONLINE_USERS_KEY, attendant.id, JSON.stringify({ ...attendant, status: 'idle' }));
            }

            realtimeApi.post('/webhooks/iam', {
                event: 'incoming_call_cancelled',
                payload: { customerId, attendantId },
            }).catch((err) => console.error('[Realtime] cancel_incoming_call failed:', err));

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
