import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { formatDatePtBr } from '#utils/format_date_ptbr';
import { getTransactionModel } from '#models/singleton';
import { validateInput } from 'src/validations/transaction/create';
import { ITransactionController, ITransactionParams } from './params';

type IInput = ITransactionController['ICreate']['IInput'];
type IOutput = ITransactionController['ICreate']['IOutput'];

interface Props {
    mapped: IInput;
}

export class Create {
    public static readonly classId = Symbol.for('Controller > Transaction > Create');

    private constructor() {}

    static construir(classId: symbol): Create {
        if (classId !== Symbol.for('Controller > Transaction')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Create();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const params = this.transform(props.mapped);
            logger.info({ userId: params.userId, type: params.type, amount: params.amount }, 'transaction create');

            const model = getTransactionModel();
            const doc = await model.create(params);

            const output: ITransactionParams = {
                id: doc._id.toString(),
                message: doc.message,
                date: formatDatePtBr(doc.createdAt),
                type: doc.type,
                amount: doc.amount,
            };

            return successData(output);
        } catch (error: unknown) {
            return logError(error, '/transactions/create');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        userId: mapString(body.userId),
        message: mapString(body.message),
        type: body.type,
        amount: typeof body.amount === 'number' ? body.amount : Number(body.amount),
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
