import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { ICallController } from './params';
import { updateParticipantWithRetry } from './participant_transaction';

type IInput = ICallController['IAddParticipant']['IInput'];
type IOutput = ICallController['IAddParticipant']['IOutput'];

interface Props {
    mapped: IInput;
}

export class AddParticipant {
    public static readonly classId = Symbol.for('Controller > Call > AddParticipant');

    private constructor() {}

    static construir(classId: symbol): AddParticipant {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new AddParticipant();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        const { customerId, attendantId, userId } = props.mapped;

        try {
            logger.info({ customerId, attendantId, userId }, 'call add-participant');
            if (!customerId || !attendantId || !userId) throw new BadRequestException('customerId, attendantId e userId são obrigatórios');

            const updated = await updateParticipantWithRetry(customerId, attendantId, (builder) => builder.addParticipant(userId));
            return successData(updated);
        } catch (error: unknown) {
            return logError(error, '/calls/add-participant');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        attendantId: mapString(body.attendantId),
        userId: mapString(body.userId),
    });
}
