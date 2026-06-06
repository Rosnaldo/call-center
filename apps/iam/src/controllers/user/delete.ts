import { Request } from 'express';

import { logError } from '#utils/log_error';
import { UserCrud } from '#crud/user';
import { IUserController } from './params';
import { Either, successData } from '#utils/either';
import { BadRequestException } from '#exceptions/bad_request';
import { IUser } from '#schemas/user/types';
import { mapString } from '#utils/mapper/string';
import { UserRole } from '@repo/shared-types';
import { UnauthorizedRequestException } from '#exceptions/unauthorized_request';
import { getKcMain } from '#keycloak/singleton';
import { validateInput } from 'src/validations/user/delete';
import _ from 'lodash';

type IInput = IUserController['IDelete']['IInput'];
type IOutput = IUserController['IDelete']['IOutput'];

type Mapped = IInput;

interface Props {
    mapped: IInput;
    userSource: IUser['IParams'];
}

export class Delete {
    public static readonly classId = Symbol.for('Controller > User > Delete');
    private readonly crud: UserCrud;

    private constructor() {
        this.crud = new UserCrud();
    }

    static construir(classId: symbol): Delete {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Delete();
    }

    public readonly exec = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { mapped, userSource } = props;
            const params = this.transform(mapped);
            const { _id } = params;

            if (userSource.role !== UserRole.admin && userSource._id !== _id) {
                throw new UnauthorizedRequestException('Usuario sem permissão')
            }
            const user = await this.crud.findById(_id);
            if (_.isNil(user)) {
                throw new BadRequestException('User not found')
            }
            await this.crud.delete(_id);

            if (user.role === 'admin' || user.role === 'customer') {
                const kcMain = getKcMain();
                const client = await kcMain.getKcClientCredentials();
                const list = await client.users.find({ email: user.email });
                if (list.length === 0) {
                    throw new BadRequestException('User not found on keycloak')
                }
    
                const userId = list[0]?.id || '';
                await client.users.del({ id: userId });
            }
            return successData({});
        } catch (error: unknown) {
            return logError(error, '/users/delete');
        }
    };

    public readonly mapper = (body: Request['body']): Mapped => {
        const {
            _id,
        } = body;

        return {
            _id: mapString(_id),
        };
    };

    public readonly transform = (mapped: Mapped): IInput => {
        const zodResult = validateInput(mapped);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);

        return zodResult.data as unknown as IInput;
    };
}
