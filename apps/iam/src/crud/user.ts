import mongoose, { ProjectionType } from 'mongoose';
import { getUserDao } from '#daos/singleton';

import { BadRequestException } from '#exceptions/bad_request';
import { UniqueIndex } from '#indexes/unique_index';
import { ICrud } from './type';
import { isMongoError } from '#utils/is_mongo_error';
import { FilterQuery, QueryOptions } from 'mongoose';
import { IUser } from '#schemas/user/types';
import { UserUtils } from '#schemas/user/utils';

export class UserCrud implements ICrud<IUser['IParams']> {
    public readonly utils = new UserUtils();

    public readonly count = async (data: FilterQuery<IUser['IParams']> = {}, options: QueryOptions<IUser['IParams']> = {}): Promise<number> => {
        return await getUserDao().count(data);
    };
    public readonly find = async (data: FilterQuery<IUser['IParams']>, projection: ProjectionType<IUser['IParams']> = {}, options: QueryOptions<IUser['IParams']> = {}): Promise<Array<IUser['IParams']>> => {
        const users = await getUserDao().find(data, projection, options);
        return users.map((u) => this.utils.toObject(u));
    };

    public readonly findByIds = async (ids: string[], projection: ProjectionType<IUser['IParams']> = {}): Promise<Array<IUser['IParams']>> => {
        return await this.find({ _id: { $in: ids } }, projection);
    };

    public readonly findById = async (_id: string): Promise<IUser['IParams']> =>
        await this.findOne({ _id });

    public readonly findOne = async (data: FilterQuery<IUser['IParams']>): Promise<IUser['IParams']> => {
        const user = await getUserDao().findOne(data);
        if (!user) throw new BadRequestException('User não encontrado');
        return this.utils.toObject(user);
    };

    public create = async (data: Partial<IUser['IParams']>): Promise<IUser['IParams']> => {
        try {
            const user = await getUserDao().inserir(data);
            return this.utils.toObject(user);
        } catch (error: unknown) {
            this.verifyError(error);
            throw error;
        }
    };

    public update = async (_id: string, data: Partial<IUser['IParams']>): Promise<IUser['IParams']> => {
        try {
            const user = await getUserDao().findOneAndUpdate(_id, data);
            if (!user) throw new BadRequestException('Erro de Update: User não encontrado');
            return this.utils.toObject(user);
        } catch (error: unknown) {
            this.verifyError(error);
            throw error;
        }
    };

    public delete = async (_id: string): Promise<void> => {
        try {
            return await getUserDao().delete(_id).then();
        } catch (error: unknown) {
            this.verifyError(error);
            throw error;
        }
    };

    private readonly verifyError = (error: unknown): void => {
        if (error instanceof Error) {
            if (isMongoError(error)) {
                this.verifyUniqueIndexError(error);
            }
            this.verifyValidationError(error);
        }
    };

    private readonly verifyValidationError = (error: unknown): void => {
        if (error instanceof mongoose.Error.ValidationError) {
            throw new BadRequestException(error?.message);
        }
    };

    private readonly verifyUniqueIndexError = (error: Error): void => {
        const uniqueEmail = error.message.includes(UniqueIndex.User.email.key);
        if (uniqueEmail) {
            throw new BadRequestException(UniqueIndex.User.email.error);
        }
    };
}
