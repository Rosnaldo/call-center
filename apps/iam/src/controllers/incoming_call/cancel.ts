import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput, ICancelInput } from 'src/validations/incoming_call/cancel';
import { notifyIncomingCallCancelled } from 'src/services/realtime';
import { findCallByUser } from 'src/interactors/find_call_by_user';
import { getOnlineUserPair, setOnlineUser } from 'src/interactors/online_user';

const INCOMING_CALL_PREFIX = 'incoming_call:';

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

            const { customer, attendant } = await getOnlineUserPair(customerId, attendantId);

            const existingCall = (await findCallByUser(customerId)) ?? (await findCallByUser(attendantId));
            if (existingCall) throw new BadRequestException('Não é possível cancelar: a chamada já foi aceita.');

            await redis.del(`${INCOMING_CALL_PREFIX}${attendantId}`);

            await Promise.all([
                setOnlineUser(customer, { status: 'idle' }),
                setOnlineUser(attendant, { status: 'idle' }),
            ]);

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
