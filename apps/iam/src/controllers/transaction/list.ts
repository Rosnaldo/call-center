import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { mapNumber } from '#utils/mapper/number';
import { toUndefined } from '#utils/mapper/to_undefined';
import { formatDatePtBr } from '#utils/format_date_ptbr';
import { getTransactionModel } from '#models/singleton';
import { validateInput } from 'src/validations/transaction/list';
import { ITransactionController, ITransactionParams } from './params';

type IInput = ITransactionController['IList']['IInput'];
type IOutput = ITransactionController['IList']['IOutput'];

interface Props {
    params: IInput;
}

interface ITotalByType {
    _id: 'charge' | 'reload';
    total: number;
}

export class List {
    public static readonly classId = Symbol.for('Controller > Transaction > List');

    private constructor() {}

    static construir(classId: symbol): List {
        if (classId !== Symbol.for('Controller > Transaction')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new List();
    }

    public readonly get = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const params = this.transform(props.params);
            const { userId, page, limit, search, type } = params;
            logger.info({ userId, page, limit, search, type }, 'transaction list');

            const model = getTransactionModel();
            const filter: Record<string, unknown> = { userId };
            if (type) filter.type = type;
            if (search) filter.message = { $regex: search, $options: 'i' };

            const skip = (page - 1) * limit;

            const [docs, total, totalsByType] = await Promise.all([
                model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
                model.countDocuments(filter),
                model.aggregate<ITotalByType>([
                    { $match: { userId } },
                    { $group: { _id: '$type', total: { $sum: '$amount' } } },
                ]),
            ]);

            const totalCredited = totalsByType.find((t) => t._id === 'reload')?.total ?? 0;
            const totalDebited = totalsByType.find((t) => t._id === 'charge')?.total ?? 0;

            const transactions: ITransactionParams[] = docs.map((doc) => ({
                id: doc._id.toString(),
                message: doc.message,
                date: formatDatePtBr(doc.createdAt),
                type: doc.type,
                amount: doc.amount,
            }));

            const output: IOutput = {
                transactions,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1),
                totalCredited,
                totalDebited,
            };

            return successData(output);
        } catch (error: unknown) {
            return logError(error, '/transactions/list');
        }
    };

    public readonly mapper = (query: Request['query']): IInput => ({
        userId: mapString(query.userId as string),
        page: mapNumber(query.page as string, 1),
        limit: mapNumber(query.limit as string, 8),
        ...(query.search ? { search: toUndefined('search', query.search) } : {}),
        ...(query.type ? { type: query.type as 'charge' | 'reload' } : {}),
    });

    private readonly transform = (params: IInput): IInput => {
        const zodResult = validateInput(params);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
