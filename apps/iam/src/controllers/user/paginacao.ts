import { Request } from 'express';

import { getUserDao } from '#daos/singleton';

import { IUser } from '#schemas/user/types';
import { logError } from '#utils/log_error';
import { UserCrud } from '#crud/user';
import { IUserController } from './params';
import { EitherPaginacao, successData } from '#utils/either_paginacao';
import { mapNumber } from '#utils/mapper/number';
import { mapBoolean } from '#utils/mapper/boolean';
import { toUndefined } from '#utils/mapper/to_undefined';
import { validateInput } from 'src/validations/user/paginacao';
import { BadRequestException } from 'src/exceptions/bad_request';
import _ from 'lodash';

type IInput = IUserController['IPaginacao']['IInput'];

interface Props {
    params: IInput;
    user: IUser['IParams'];
}

export class Paginacao {
    public readonly classId = Symbol.for('Controller > User > Paginacao');
    private readonly crud: UserCrud;

    private constructor() {
        this.crud = new UserCrud();
    }

    static construir(classId: symbol): Paginacao {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new Paginacao();
    }

    public readonly get = async (props: Props): Promise<EitherPaginacao<IUser['IParams']>> => {
        try {
            const { user: _user } = props;
            const input = this.transform(props.params);
            const { page, pageSize, isPagination, search } = input;
            const query = _.isNil(search) ? {} : {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ],
            };
            const skip = (page - 1) * pageSize;
            const paginacao = isPagination ? { limit: pageSize, skip } : {};

            const list = await this.crud.find(query, {}, { ...paginacao });
            const totalRecords = await getUserDao().count(query);

            return successData(list, {
                currentPage: page,
                totalPages: Math.ceil(totalRecords / pageSize),
                totalRecords,
                size: pageSize
            });
        } catch (error: unknown) {
            return logError(error, '/users/list');
        }
    };

    public readonly mapper = (body: Request['body']): IInput => {
        const {
            page,
            pageSize,
            isPagination,
            search,
        } = body;

        return {
            pageSize: mapNumber(pageSize, 10),
            page: mapNumber(page, 1),
            isPagination: mapBoolean({ v: isPagination, defaultV: true }),
            ...(search ? { search: toUndefined('search', search) } : {}),
        };
    };

    public readonly transform = (params: IInput): IInput => {
        const zodResult = validateInput(params);
        if (zodResult.hasError) throw new BadRequestException(zodResult.message!);

        return zodResult.data as unknown as IInput;
    };
}
