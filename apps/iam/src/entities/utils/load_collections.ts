import { Connection } from 'mongoose';
import { CollectionsName } from '#const/collection_name_mapping';
import logger from '#logger';

export class LoadCollections {
    private readonly loadCollections = (connection: Connection): Promise<void> => {
        try {
            return Promise.all(CollectionsName.map((collectionName) => connection.createCollection(collectionName))).then();
        } catch (error) {
            logger.error(error, '[LoadCollections.loadCollections]: Error loading indexes')
            throw error;
        }
    };

    public readonly synchronous = async (connection: Connection): Promise<void> => this.loadCollections(connection);
};
