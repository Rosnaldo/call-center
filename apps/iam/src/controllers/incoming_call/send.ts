import { Request } from 'express';

import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput } from 'src/validations/incoming_call/send';
import { IIncomingCallController } from './params';
import { IOnlineUser } from '@repo/shared-types';
import { realtimeApi } from '#apis/realtime';

type IInput = IIncomingCallController['ISend']['IInput'];
type IOutput = IIncomingCallController['ISend']['IOutput'];

const INCOMING_CALL_KEY = 'incoming_calls';
const ONLINE_USERS_KEY = 'online_users';

interface Props {
    mapped: IInput;
}

export class Send {
    public static readonly classId = Symbol.for('Controller > IncomingCall > Send');

    private constructor() {}

    static construir(classId: symbol): Send {
        if (classId !== Symbol.for('Controller > IncomingCall')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Send();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const params = this.transform(props.mapped);
            const redis = getRedisClient();

            const existing = await redis.hget(INCOMING_CALL_KEY, params.attendantId);

            if (existing) {
                const attendantJson = await redis.hget(ONLINE_USERS_KEY, params.attendantId);
                const attendantName = attendantJson
                    ? (JSON.parse(attendantJson) as IOnlineUser).name
                    : params.attendantId;
                throw new BadRequestException(`Atendente ${attendantName} já está em ligação.`);
            }

            await redis.hset(INCOMING_CALL_KEY, params.attendantId, JSON.stringify(params));

            const customerJson = await redis.hget(ONLINE_USERS_KEY, params.customerId);
            if (customerJson) {
                const customer = JSON.parse(customerJson) as IOnlineUser;
                await redis.hset(ONLINE_USERS_KEY, customer.id, JSON.stringify({ ...customer, status: 'occupied' }));
            }

            const attendantJson2 = await redis.hget(ONLINE_USERS_KEY, params.attendantId);
            if (attendantJson2) {
                const attendant = JSON.parse(attendantJson2) as IOnlineUser;
                await redis.hset(ONLINE_USERS_KEY, attendant.id, JSON.stringify({ ...attendant, status: 'occupied' }));
            }

            realtimeApi.post('/webhooks/iam', {
                event: 'incoming_call_sent',
                payload: { customerId: params.customerId, attendantId: params.attendantId, whoIsCalling: params.whoIsCalling },
            }).catch((err) => console.error('[Realtime] send_incoming_call failed:', err));

            return successData(params);
        } catch (error: unknown) {
            return logError(error, '/incoming-calls/send');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
        whoIsCalling: mapString(body.whoIsCalling) as IInput['whoIsCalling'] || 'customer',
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
