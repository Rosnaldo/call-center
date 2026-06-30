import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput } from 'src/validations/incoming_call/send';
import { IIncomingCallController } from './params';
import { IOnlineUser } from '@repo/shared-types';
import { notifyIncomingCallSent } from 'src/services/realtime';

type IInput = IIncomingCallController['ISend']['IInput'];
type IOutput = IIncomingCallController['ISend']['IOutput'];

const INCOMING_CALL_PREFIX = 'incoming_call:';
const ONLINE_USERS_PREFIX = 'online_user:';

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
            logger.info({ customerId: props.mapped.customerId, attendantId: props.mapped.attendantId }, 'incoming call send');
            const params = this.transform(props.mapped);
            const redis = getRedisClient();

            const existing = await redis.get(`${INCOMING_CALL_PREFIX}${params.attendantId}`);

            if (existing) {
                const attendantJson = await redis.get(`${ONLINE_USERS_PREFIX}${params.attendantId}`);
                const attendantName = attendantJson
                    ? (JSON.parse(attendantJson) as IOnlineUser).name
                    : params.attendantId;
                throw new BadRequestException(`Atendente ${attendantName} já está em ligação.`);
            }

            await redis.set(`${INCOMING_CALL_PREFIX}${params.attendantId}`, JSON.stringify(params), 'EX', 60);

            const customerJson = await redis.get(`${ONLINE_USERS_PREFIX}${params.customerId}`);
            if (customerJson) {
                const customer = JSON.parse(customerJson) as IOnlineUser;
                await redis.set(`${ONLINE_USERS_PREFIX}${customer.id}`, JSON.stringify({ ...customer, status: 'occupied' }), 'EX', 90);
            }

            const attendantJson2 = await redis.get(`${ONLINE_USERS_PREFIX}${params.attendantId}`);
            if (attendantJson2) {
                const attendant = JSON.parse(attendantJson2) as IOnlineUser;
                await redis.set(`${ONLINE_USERS_PREFIX}${attendant.id}`, JSON.stringify({ ...attendant, status: 'occupied' }), 'EX', 90);
            }

            notifyIncomingCallSent(params.customerId, params.attendantId, params.calledBy).catch(() => {});

            return successData(params);
        } catch (error: unknown) {
            return logError(error, '/incoming-calls/send');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
        calledBy: mapString(body.calledBy) as IInput['calledBy'] || 'customer',
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
