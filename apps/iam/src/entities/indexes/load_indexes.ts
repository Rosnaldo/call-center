import { Connection } from 'mongoose';
import path from 'path';
import { IndexDescription } from 'mongodb';
import { RuntimeFiles } from '#utils/runtime_files';
import logger from '#logger';

export class LoadIndexes {
    private readonly connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    };

    private readonly createIndexes = async (indexes: Array<IndexDescription>, collectionName: string): Promise<string[]> => {
        try {
            const collection = this.connection.collection(collectionName);

            const existing = await collection.indexes();
            const existingNames = new Set(existing.map(i => i.name));

            const missing = indexes.filter(i => !existingNames.has(i.name!));
            if (!missing.length) return [];

            return await collection.createIndexes(missing);
        } catch (error) {
            logger.error(error, `[LoadIndexes.createIndexes]: Error create index ${collectionName}`)
            throw error;
        }
    };

    private readonly getIndexesFiles = (): string[] => {
        try {
            const runtime = new RuntimeFiles();
            const dir = path.join(__dirname, 'entities');
            return runtime.get(dir, __filename);
        } catch (error) {
            logger.error(error, '[LoadIndexes.getIndexesFiles]: Error loading index file')
            throw error;
        }
    };

    private readonly loadIndexes = (): Promise<void> => {
        try {
            return Promise.all(this.getIndexesFiles().map(async (file) => {
                const result = await import(file);
                const { indexes, collectionName } = result.default;
                await this.createIndexes(indexes, collectionName);
            })).then();
        } catch (error) {
            logger.error(error, '[LoadIndexes.loadIndexes]: Error loading indexes')
            throw error;
        }
    };

    public readonly synchronous = async (): Promise<void> => this.loadIndexes();

    public readonly fireAndForget = (): void => {
        setImmediate(() => {
            this.loadIndexes().catch((error) =>
                logger.error(error, '[LoadIndexes.fireAndForget]')
            );
        });
    };
}
