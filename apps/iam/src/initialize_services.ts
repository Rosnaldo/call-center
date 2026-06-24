import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { Properties } from './properties';
import './extensions/transform_in_dict';

import { mongooseBootstrap } from '#mongoose_bootstrap';
import { routeBootstrap } from '#route_bootstrap';
import { buildKcMain } from '#keycloak/singleton';
import { connectRedis, disconnectRedis } from '#redis/singleton';

class InitializeServices {
    private static instance: InitializeServices;

    app = express();
    properties: Properties;

    private constructor(properties: Properties) {
        this.properties = properties;
    }

    static getInstance(properties?: Properties): InitializeServices {
        if (!InitializeServices.instance) {
            InitializeServices.instance = new InitializeServices(
                properties ?? Properties.getInstance()
            );
        }
        return InitializeServices.instance;
    }

    static reset(): void {
        InitializeServices.instance = undefined as unknown as InitializeServices;
    }

    async start(): Promise<void> {
        let isShuttingDown = false;

        try {
            if (this.properties.nodeEnv !== 'test') {
                await buildKcMain();
            }

            await mongooseBootstrap();
            await connectRedis();

            this.app.use(cors());
            this.app.use(express.json());

            this.app.use(express.json({ limit: '10MB' }));
            this.app.use(express.urlencoded({ extended: false }));

            await routeBootstrap(this.app);

            const server = this.app.listen(Number(this.properties.port), '0.0.0.0', () => {
                console.log(`Application running on  ${this.properties.port}`);
            });

            const gracefulShutdown = async () => {
                if (isShuttingDown) return;
                isShuttingDown = true;

                try {
                    await Promise.all(mongoose.connections.map((conn) => conn.close(false)));
                    console.log('[DB] Todas as conexões Mongo fechadas');
                } catch (err) {
                    console.error('[DB] Erro ao fechar conexões', err);
                }

                try {
                    await disconnectRedis();
                    console.log('[Redis] Conexão fechada');
                } catch (err) {
                    console.error('[Redis] Erro ao fechar conexão', err);
                }
                server.close(() => {
                    console.log(`[*] - WEB Service - Closed`);
                    process.exit(0);
                });

                setTimeout(() => {
                    console.error('Forçando shutdown após timeout');
                    process.exit(1);
                }, 10_000);
            }

            process.on('SIGINT', gracefulShutdown);
            process.on('SIGTERM', gracefulShutdown);
        } catch (error) {
            console.error('Error initializing services:', error);
            process.exit(1);
        }
    }
}

export { InitializeServices };
