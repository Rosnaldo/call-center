import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { getRedisClient } from '#redis/singleton';
import { mapString } from '#utils/mapper/string';
import { validateInput } from 'src/validations/incoming_call/send';
import { IIncomingCallController } from './params';
import { notifyIncomingCallSent } from 'src/services/call_events';
import { UserCrud } from '#crud/user';
import { getOnlineUserPair, setOnlineUser } from 'src/interactors/online_user';
import { findCallByUser } from 'src/interactors/find_call_by_user';

type IInput = IIncomingCallController['ISend']['IInput'];
type IOutput = IIncomingCallController['ISend']['IOutput'];

const INCOMING_CALL_PREFIX = 'incoming_call:';

interface Props {
    traceId: string;
    mapped: IInput;
}

export class Send {
    public static readonly classId = Symbol.for('Controller > IncomingCall > Send');
    private readonly crud: UserCrud;

    private constructor() {
        this.crud = new UserCrud();
    }

    static construir(classId: symbol): Send {
        if (classId !== Symbol.for('Controller > IncomingCall')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Send();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            logger.info({ customerId: props.mapped.customerId, attendantId: props.mapped.attendantId }, 'incoming call send');
            const params = this.transform(props.mapped);
            const redis = getRedisClient();

            const [{ customer, attendant }, existing, existingCall] = await Promise.all([
                getOnlineUserPair(params.customerId, params.attendantId),
                redis.get(`${INCOMING_CALL_PREFIX}${params.attendantId}`),
                findCallByUser(params.customerId).then((call) => call ?? findCallByUser(params.attendantId)),
            ]);

            if (customer.status !== 'idle') throw new BadRequestException(`Cliente não está disponível.`);

            const customerUser = await this.crud.findById(params.customerId);
            if ((customerUser.tokens ?? 0) <= 0) throw new BadRequestException('Cliente sem créditos.');

            if (attendant.status !== 'idle') throw new BadRequestException(`Atendente ${attendant.name} não está disponível.`);
            if (existing) throw new BadRequestException(`Atendente ${attendant.name} já está em ligação.`);
            if (existingCall) throw new BadRequestException(`Já existe uma ligação em andamento.`);

            await redis.set(`${INCOMING_CALL_PREFIX}${params.attendantId}`, JSON.stringify(params), 'EX', 60);
            await Promise.all([
                setOnlineUser(customer, { status: 'occupied' }),
                setOnlineUser(attendant, { status: 'occupied' }),
            ]);

            notifyIncomingCallSent(traceId, params.customerId, params.attendantId, params.calledBy);

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
