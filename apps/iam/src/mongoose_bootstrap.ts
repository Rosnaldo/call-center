import { connectMain, getMainConnection } from "#db/singleton";
import { LoadCollections } from "#entities/utils/load_collections";
import { LoadModels } from "#entities/utils/load_models";
import { LoadIndexes } from "#indexes/load_indexes";
import { Migration } from "#migrations/migration";
import Properties from "#properties";

type IParams = { testTransaction?: boolean, e2e?: () => Promise<void> };

const initParams = { e2e: async () => {} };

export const mongooseBootstrap = async (
    { testTransaction = false, e2e }: IParams = initParams,
) => {
    const concistentEnvs = ['prod', 'dev', 'test'];

    const migration = new Migration();
    
    await connectMain({ testTransaction });
    const connection = getMainConnection();

    const collections = new LoadCollections();
    await collections.synchronous(connection);
    const models = new LoadModels();
    models.synchronous();

    const loadIndexes = new LoadIndexes(connection);
    if (concistentEnvs.includes(Properties.nodeEnv)) {
        await loadIndexes.synchronous();
    } else {
        void loadIndexes.fireAndForget();
    }

    if (['dev', 'local'].includes(Properties.nodeEnv)) {
        await migration.runScripts();
    }

    if (['e2e'].includes(Properties.nodeEnv)) {
        await e2e?.();
    }
};
