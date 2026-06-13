import path from 'path';
import { type Application } from 'express';
import { RuntimeFiles } from '#utils/runtime_files';

export class LoadRoutes {
    private readonly app: Application;
    constructor(app: Application) {
        this.app = app;
    }

    private readonly loadRoutes = (): Promise<void> => {
        try {
            const routesPath = path.join(__dirname, '..');
            const runtime = new RuntimeFiles();
            const files = runtime.get(routesPath, __filename);
            return Promise.all(
                files.map(async (file) => {
                    const { default: route } = await import(file);
                    route(this.app);
                })
            ).then();
        } catch (error) {
            console.error(`[LoadRoutes.loadRoutes]: Error loading routes`, error)
            throw error;
        }
    }

    public readonly synchronous = async (): Promise<void> => {
        return this.loadRoutes();
    };

    public readonly fireAndForget = (): void => {
        setImmediate(() => {
            this.loadRoutes()
                .catch((error) => console.error('[LoadRoutes.fireAndForget]: Errorloading routes', error))
        });
    };
}
