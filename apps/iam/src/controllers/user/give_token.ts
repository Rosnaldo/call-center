import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { getUserModel, getTransactionModel } from '#models/singleton';
import { UserUtils } from '#schemas/user/utils';
import { notifyUserTokenCharged } from 'src/services/realtime';
import { IUserController } from './params';
import { validateInput } from 'src/validations/user/give_token';

type IInput = IUserController['IGiveToken']['IInput'];
type IOutput = IUserController['IGiveToken']['IOutput'];

interface Props {
    traceId: string;
    mapped: IInput;
}

export class GiveToken {
    public static readonly classId = Symbol.for('Controller > User > GiveToken');
    private readonly utils: UserUtils;

    private constructor() {
        this.utils = new UserUtils();
    }

    static construir(classId: symbol): GiveToken {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new GiveToken();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            const params = this.transform(props.mapped);
            const { customerId, tokens, message } = params;
            logger.info({ customerId, tokens }, 'user give-token');

            const user = await getUserModel().findById(customerId);
            if (!user) throw new BadRequestException('Cliente não encontrado');

            user.tokens = (user.tokens ?? 0) + tokens;
            await user.save();

            await getTransactionModel().create({
                userId: customerId,
                message,
                type: 'reload',
                amount: tokens,
            });

            const updated = this.utils.toObject(user);

            notifyUserTokenCharged(traceId, updated).catch(() => {});

            return successData(updated);
        } catch (error: unknown) {
            return logError(error, '/users/give-token');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        tokens: typeof body.tokens === 'number' ? body.tokens : Number(body.tokens),
        message: mapString(body.message),
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
