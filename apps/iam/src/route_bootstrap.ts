import Properties from "#properties";
import type { Express } from 'express';
import { LoadRoutes } from "#routes/config/load_routes";

export const routeBootstrap = async (app: Express) => {
    const concistentEnvs = ['prod', 'dev', 'test'];

    const loadRoutes = new LoadRoutes(app);
    if (concistentEnvs.includes(Properties.nodeEnv)) {
        await loadRoutes.synchronous();
    } else {
        void loadRoutes.fireAndForget();
    }
};
