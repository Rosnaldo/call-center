import { Request } from 'express';

import { logError } from '#utils/log_error';
import { IUserController } from './params';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { UserBuilder } from '#schemas/user/utils';
import { mapString } from '#utils/mapper/string';
import { getKcMain } from '#keycloak/singleton';
import { validateInput } from 'src/validations/user/create';

type IInput = IUserController['ICreate']['IInput'];
type IOutput = IUserController['ICreate']['IOutput'];

type Mapped = Omit<IInput, 'role'> & {
    role?: string;
};

interface Props {
    mapped: Mapped;
}

export class Create {
    public static readonly classId = Symbol.for('Controller > User > Create');

    private constructor() {}

    static construir(classId: symbol): Create {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Create();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { mapped } = props;
            const params = this.transform(mapped);
            const builder = new UserBuilder();
            const user = await builder.create(params).save();

            const kcMain = getKcMain();
            const client = await kcMain.getKcClientCredentials();
            await client.users.create({
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            });
            return successData(user);
        } catch (error: unknown) {
            return logError(error, '/iam/users/create');
        }
    };

    public readonly mapper = (body: Request['body']): Mapped => {
        const {
            firstName,
            lastName,
            email,
            role,
        } = body;

        return {
            firstName: mapString(firstName),
            lastName: mapString(lastName),
            email: mapString(email),
            role: mapString(role),
        };
    };

    public readonly transform = (mapped: Mapped): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);

        return zodResult.data as unknown as IInput;
    };
}
