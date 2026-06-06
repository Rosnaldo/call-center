import { Types } from 'mongoose';
import type { DeleteResult, FilterQuery, InsertManyResult, ProjectionType, QueryOptions, SaveOptions } from 'mongoose';

import { GetIndexes } from './types';
import { IUser } from '#schemas/user/types';

export type IUserDao = ReturnType<typeof UserFactoryDao>;

export const UserFactoryDao = (model: IUser['IModel']) => ({
    count: async (query: FilterQuery<IUser['IParams']>): Promise<number> =>
        model.countDocuments(query),

    exists: async (_id: Types.ObjectId): Promise<boolean> => {
        const result = await model.exists({ _id });
        return !!result;
    },

    getIndexes: async (): Promise<GetIndexes> => {
        return model.collection.getIndexes();
    },

    inserir: async (data: Partial<IUser['IParams']>, options: SaveOptions = {}): Promise<IUser['IDocument']> =>
        await new model(data).save(options),

    inserirBatch: async (docs: Array<Partial<IUser['IParams']>>, options: SaveOptions = {}): Promise<InsertManyResult<IUser['IDocument']>> =>
        await model.insertMany(docs, {
            ordered: false,        // continue inserting even if one fails (e.g., duplicate key)
            rawResult: true,       // returns MongoDB driver result in addition to docs
        }),

    find: async (
        query: FilterQuery<IUser>,
        projection: ProjectionType<IUser['IParams']>  = {},
        options: QueryOptions<IUser['IParams']>  = {}
    ): Promise<Array<IUser['IDocument']>> => await model.find(query, projection, options),

    findById: async (_id: string, projection: any = {}): Promise<IUser['IDocument'] | null> =>
        await model.findById(_id, projection),

    findOne: async (query: FilterQuery<IUser['IParams']>, projection: ProjectionType<IUser['IParams']> = {}): Promise<IUser['IDocument'] | null> =>
        await model.findOne(query, projection),

    findByEmail: async (email: string): Promise<IUser['IDocument'] | null> => model.findOne({ email }),

    findOneAndUpdate: async (
        _id: string,
        atualizacoes: Partial<IUser['IParams']>
    ): Promise<IUser['IDocument'] | null> =>
        await model.findOneAndUpdate(
            { _id },
            { $set: atualizacoes },
            {}
        ),

    delete: async (
        _id: string,
    ): Promise<DeleteResult> =>
        await model.deleteOne(
            { _id },
        ),
});
