import { connectMain, getMainConnection } from "#db/singleton";
import { LoadCollections } from "#entities/utils/load_collections";
import { LoadModels } from "#entities/utils/load_models";
import Properties from "#properties";

type IParams = { testTransaction?: boolean, e2e?: () => Promise<void> };

const initParams = { e2e: async () => {} };

export const mongooseBootstrap = async (
    { testTransaction = false, e2e }: IParams = initParams,
) => {
    await connectMain({ testTransaction });
    const connection = getMainConnection();

    const collections = new LoadCollections();
    await collections.synchronous(connection);
    const models = new LoadModels();
    models.synchronous();

    if (['e2e'].includes(Properties.nodeEnv)) {
        await e2e?.();
    }
};
