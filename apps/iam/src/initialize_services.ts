import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
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
    server: http.Server | null = null;
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

            const port = this.properties.nodeEnv === 'test' ? 0 : Number(this.properties.port);

            this.server = await new Promise<http.Server>((resolve) => {
                const s = this.app.listen(port, '0.0.0.0', () => {
                    const addr = s.address();
                    const boundPort = typeof addr === 'object' ? addr!.port : port;
                    this.properties.port = boundPort;
                    console.log(`Application running on  ${boundPort}`);
                    resolve(s);
                });
            });

            if (this.properties.nodeEnv === 'test') return;

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
                this.server!.close(() => {
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

    async stop(): Promise<void> {
        if (this.server) {
            await new Promise<void>((resolve) => this.server!.close(() => resolve()));
            this.server = null;
        }

        try {
            await Promise.all(mongoose.connections.map((conn) => conn.close(false)));
        } catch (err) {
            console.error('[DB] Erro ao fechar conexões', err);
        }

        try {
            await disconnectRedis();
        } catch (err) {
            console.error('[Redis] Erro ao fechar conexão', err);
        }
    }
}

export { InitializeServices };
