import { IMigration } from '#schemas/migration';

export type IMigrationDao = ReturnType<typeof MigrationFactoryDao>;

export const MigrationFactoryDao = (model: IMigration['IModel']) => ({
    findOne: async (script: string): Promise<IMigration['IDocument'] | null> =>
        await model.findOne({ script }),
    insert: async (script: string): Promise<IMigration['IDocument']> =>
        await new model({ script }).save(),
});
