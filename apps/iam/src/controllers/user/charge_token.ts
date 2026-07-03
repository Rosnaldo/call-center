import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { mapString } from '#utils/mapper/string';
import { getUserModel } from '#models/singleton';
import { UserUtils } from '#schemas/user/utils';
import { notifyUserTokenCharged } from 'src/services/realtime';
import { IUserController } from './params';
import { validateInput } from 'src/validations/user/charge_token';

type IInput = IUserController['IChargeToken']['IInput'];
type IOutput = IUserController['IChargeToken']['IOutput'];

interface Props {
    traceId: string;
    mapped: IInput;
}

export class ChargeToken {
    public static readonly classId = Symbol.for('Controller > User > ChargeToken');
    private readonly utils: UserUtils;

    private constructor() {
        this.utils = new UserUtils();
    }

    static construir(classId: symbol): ChargeToken {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new ChargeToken();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { traceId } = props;
            const params = this.transform(props.mapped);
            const { customerId, tokens } = params;
            logger.info({ customerId, tokens }, 'user charge-token');

            const user = await getUserModel().findById(customerId);
            if (!user) throw new BadRequestException('Cliente não encontrado');

            user.tokens = (user.tokens ?? 0) - tokens;
            await user.save();

            const updated = this.utils.toObject(user);

            notifyUserTokenCharged(traceId, updated).catch(() => {});

            return successData(updated);
        } catch (error: unknown) {
            return logError(error, '/users/charge-token');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => ({
        customerId: mapString(body.customerId),
        tokens: typeof body.tokens === 'number' ? body.tokens : Number(body.tokens),
    });

    private readonly transform = (mapped: IInput): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);
        return zodResult.data as unknown as IInput;
    };
}
