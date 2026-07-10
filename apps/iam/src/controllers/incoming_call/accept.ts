import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { IIncomingCallController } from './params';
import { IncomingCallState } from '@repo/shared-types';
import { notifyCallAccepted } from 'src/services/realtime';
import { ensureDailyRoom } from 'src/services/daily';
import { validateInput } from 'src/validations/incoming_call/accept';
import { getOnlineUserPair, setOnlineUser } from 'src/interactors/online_user';

type IInput = IIncomingCallController['IAccept']['IInput'];
type IOutput = IIncomingCallController['IAccept']['IOutput'];

const INCOMING_CALL_PREFIX = 'incoming_call:';

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

            const { customer, attendant } = await getOnlineUserPair(incomingCall.customerId, incomingCall.attendantId);
            const roomName = `${customer.slug}--${attendant.slug}`;

            await redis.del(`${INCOMING_CALL_PREFIX}${attendantId}`);

            await Promise.all([
                setOnlineUser(customer, { status: 'in-call' }),
                setOnlineUser(attendant, { status: 'in-call' }),
            ]);

            // Awaited: the room must exist before the client is told the call
            // was accepted, or it can try to join before it's there.
            await ensureDailyRoom(roomName);

            notifyCallAccepted(traceId, incomingCall.customerId, incomingCall.attendantId, incomingCall.calledBy, roomName, incomingCall).catch(() => {});

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
