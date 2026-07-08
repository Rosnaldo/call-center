import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { ICallController } from './params';
import { updateParticipantWithRetry } from './participant_transaction';

type IInput = ICallController['IRemoveParticipant']['IInput'];
type IOutput = ICallController['IRemoveParticipant']['IOutput'];

interface Props {
    mapped: IInput;
}

export class RemoveParticipant {
    public static readonly classId = Symbol.for('Controller > Call > RemoveParticipant');

    private constructor() {}

    static construir(classId: symbol): RemoveParticipant {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new RemoveParticipant();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        const { customerId, attendantId, userId } = props.mapped;

        try {
            logger.info({ customerId, attendantId, userId }, 'call remove-participant');
            if (!customerId || !attendantId || !userId) throw new BadRequestException('customerId, attendantId e userId são obrigatórios');

            const updated = await updateParticipantWithRetry(customerId, attendantId, (builder) => builder.removeParticipant(userId));
            return successData(updated);
        } catch (error: unknown) {
            return logError(error, '/calls/remove-participant');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
        userId: mapString(body.userId),
    });
}
