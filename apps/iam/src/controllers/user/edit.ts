import { Request } from 'express';
import _ from 'lodash';

import { logError } from '#utils/log_error';
import { UserCrud } from '#crud/user';
import { IUserController } from './params';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { IUser } from '#schemas/user/types';
import { UserBuilder, UserUtils } from '#schemas/user/utils';
import { mapString } from '#utils/mapper/string';
import { toUndefined } from '#utils/mapper/to_undefined';
import { or } from '#utils/ports';
import { UserRole } from '@repo/shared-types';
import { UnauthorizedRequestException } from '#exceptions/unauthorized_request';
import { getKcMain } from '#keycloak/singleton';
import { getUserModel } from '#models/singleton';
import { validateInput } from 'src/validations/user/edit';

type IInput = IUserController['IEdit']['IInput'];
type IOutput = IUserController['IEdit']['IOutput'];
type Mapped = Omit<IInput, 'role'> & {
    role?: string;
};

interface Props {
    mapped: Mapped;
    userSource: IUser['IParams'];
}

export class Edit {
    public static readonly classId = Symbol.for('Controller > User > Edit');
    private readonly crud: UserCrud;
    private readonly utils: UserUtils;

    private constructor() {
        this.crud = new UserCrud();
        this.utils = new UserUtils();
    }

    static construir(classId: symbol): Edit {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Edit();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { mapped, userSource } = props;
            const params = this.transform(mapped);
            const { _id, firstName, lastName, email, role } = params;

            if (or(!_.isNil(email), !_.isNil(role)) && userSource.role !== UserRole.admin) {
                throw new UnauthorizedRequestException('Usuario sem permissão')
            }

            if (userSource.role !== UserRole.admin && userSource._id !== _id) {
                throw new UnauthorizedRequestException('Usuario sem permissão')
            }

            const user = await getUserModel().findById(_id);
            if (_.isNil(user)) {
                throw new BadRequestException('User not found')
            }

            const build = new UserBuilder(user);

            const updated = await build.update({ firstName, lastName, email, role }).save();

            const kcMain = getKcMain();
            const client = await kcMain.getKcClientCredentials();
            const list = await client.users.find({ email: user.email });

            if (list.length === 0) {
                throw new BadRequestException('User not found on keycloak')
            }

            const userId = list[0]?.id || '';
            await client.users.update({
                id: userId,
            }, {
                firstName, 
                lastName,
            });

            return successData(updated);
        } catch (error: unknown) {
            return logError(error, '/users/edit');
        }
    };

    public readonly mapper = (body: Request['body']): Mapped => {
        const {
            _id,
            firstName,
            lastName,
            email,
            role,
        } = body;

        return {
            _id: mapString(_id),
            ...(firstName ? { firstName: toUndefined('firstName', firstName) } : {}),
            ...(lastName ? { lastName: toUndefined('lastName', lastName) } : {}),
            ...(email ? { email: toUndefined('email', email) } : {}),
            ...(role ? { role: toUndefined('role', role) } : {}),
        };
    };

    public readonly transform = (mapped: Mapped): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);

        return zodResult.data as unknown as IInput;
    };
}
