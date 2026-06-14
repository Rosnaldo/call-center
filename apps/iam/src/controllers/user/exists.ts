import { Request } from 'express';

import { logError } from '#utils/log_error';
import { IUserController } from './params';
import { Either, successData } from '#utils/either';
import { mapString } from '#utils/mapper/string';
import { getUserDao } from '#daos/singleton';
import { UserUtils, UserBuilder } from '#schemas/user/utils';
import { validateInput } from 'src/validations/user/exists';
import { BadRequestException } from 'src/exceptions/bad_request';
import { getKcMain } from '#keycloak/singleton';
import { UserRole } from '@repo/shared-types';

type IInput = IUserController['IExists']['IInput'];
type IOutput = IUserController['IExists']['IOutput'];

interface Props {
    params: IInput;
}

export class Exists {
    public readonly classId = Symbol.for('Controller > User > Exists');
    private readonly utils: UserUtils;

    private constructor() {
        this.utils = new UserUtils();
    }

    static construir(classId: symbol): Exists {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Exists();
    }

    public readonly get = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const input = this.transform(props.params);
            const { email } = input;

            const kcMain = getKcMain();
            const client = await kcMain.getKcClientCredentials();
            const kcUsers = await client.users.find({ email, exact: true });
            const kcUser = kcUsers.find(u => u.email === email);
            if (!kcUser?.id) {
                throw new BadRequestException('Usuário não encontrado no Keycloak.');
            }

            const existingUser = await getUserDao().findOne({ email });
            if (existingUser) {
                return successData(this.utils.toObject(existingUser));
            }

            const newUser = await new UserBuilder().create({
                firstName: kcUser.firstName ?? '',
                lastName: kcUser.lastName ?? '',
                email,
                role: UserRole.customer,
            }).save();

            return successData(newUser);
        } catch (error: unknown) {
            return logError(error, '/users/exists');
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
