import { Request } from 'express';

import { logError } from '#utils/log_error';
import { IUserController } from './params';
import { Either, successData } from '#utils/either';
import { mapString } from '#utils/mapper/string';
import { getUserDao } from '#daos/singleton';
import { UserUtils } from '#schemas/user/utils';
import { validateInput } from 'src/validations/user/find-by-email';
import { BadRequestException } from 'src/exceptions/bad_request';

type IInput = IUserController['IByEmail']['IInput'];
type IOutput = IUserController['IByEmail']['IOutput'];

interface Props {
    params: IInput;
}

export class FindByEmail {
    public readonly classId = Symbol.for('Controller > User > FindByEmail');
    private readonly utils: UserUtils;

    private constructor() {
        this.utils = new UserUtils();
    }

    static construir(classId: symbol): FindByEmail {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new FindByEmail();
    }

    public readonly get = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const input = this.transform(props.params);

            const { email } = input;
            const query = { email };
            const user = await getUserDao().findOne(query);

            return successData(this.utils.toObject(user!));
        } catch (error: unknown) {
            return logError(error, '/users/by-email');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => {
        const {
            email,
        } = body;

        return {
            email: mapString(email),
        };
    };

    public readonly transform = (params: IInput): IInput => {
        const zodResult = validateInput(params);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);

        return zodResult.data as unknown as IInput;
    };
}
