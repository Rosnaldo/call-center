import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { ICallController } from './params';
import { findCallByUser } from 'src/interactors/find_call_by_user';

type IOutput = ICallController['IGet']['IOutput'];

interface Props {
    userId: string;
}

export class GetByUser {
    public static readonly classId = Symbol.for('Controller > Call > GetByUser');

    private constructor() {}

    static construir(classId: symbol): GetByUser {
        if (classId !== Symbol.for('Controller > Call')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new GetByUser();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { userId } = props;
            logger.info({ userId }, 'call get by user');
            if (!userId) throw new BadRequestException('userId é obrigatório');

            const call = await findCallByUser(userId);
            if (!call) throw new BadRequestException('Call não encontrada');

            return successData(call);
        } catch (error: unknown) {
            return logError(error, '/calls/get-by-user');
        }
    };

    public readonly mapper = (query: Request['query']): Props => ({
        userId: mapString(query.userId as string),
    });
}
