import { Request } from 'express';

import logger from '#logger';
import { logError } from '#utils/log_error';
import { IUserController } from './params';
import { Either, successData } from '#utils/either';
import { mapString } from '#utils/mapper/string';
import { getUserDao } from '#daos/singleton';
import { UserUtils } from '#schemas/user/utils';
import { BadRequestException } from '#exceptions/bad_request';

type IOutput = IUserController['IFindBySlug']['IOutput'];

interface IInput {
    slug: string;
}

interface Props {
    params: IInput;
}

export class FindBySlug {
    public readonly classId = Symbol.for('Controller > User > FindBySlug');
    private readonly utils: UserUtils;

    private constructor() {
        this.utils = new UserUtils();
    }

    static construir(classId: symbol): FindBySlug {
        if (classId !== Symbol.for('Controller > User')) {
            throw new Error(`${classId.toString()}: não pode ser instanciado`);
        }
        return new FindBySlug();
    }

    public readonly get = async (props: Props): Promise<Either<IOutput>> => {
        try {
            const { slug } = props.params;
            logger.info({ slug }, 'user find by slug');
            if (!slug) throw new BadRequestException('slug é obrigatório');

            const user = await getUserDao().findOne({ slug });
            if (!user) throw new BadRequestException('Usuário não encontrado');

            return successData(this.utils.toObject(user));
        } catch (error: unknown) {
            return logError(error, '/users/find-by-slug');
        }
    };

    public readonly mapper = (query: Request['query']): IInput => ({
        slug: mapString(query.slug as string),
    });
}
