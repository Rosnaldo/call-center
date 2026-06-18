import type { SaveOptions } from 'mongoose';
import { ICall } from '#schemas/call/types';

export type ICallDao = ReturnType<typeof CallFactoryDao>;

export const CallFactoryDao = (model: ICall['IModel']) => ({
    inserir: async (data: Partial<ICall['ISchema']>, options: SaveOptions = {}): Promise<ICall['IDocument']> =>
        await new model(data).save(options),

    findById: async (_id: string): Promise<ICall['IDocument'] | null> =>
        await model.findById(_id),
});
