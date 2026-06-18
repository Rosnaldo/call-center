import type { SaveOptions } from 'mongoose';
import { ICallUserPresence } from '#schemas/call_user_presence/types';

export type ICallUserPresenceDao = ReturnType<typeof CallUserPresenceFactoryDao>;

export const CallUserPresenceFactoryDao = (model: ICallUserPresence['IModel']) => ({
    inserir: async (data: Partial<ICallUserPresence['ISchema']>, options: SaveOptions = {}): Promise<ICallUserPresence['IDocument']> =>
        await new model(data).save(options),

    findById: async (_id: string): Promise<ICallUserPresence['IDocument'] | null> =>
        await model.findById(_id),
});
