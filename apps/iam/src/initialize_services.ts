import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
  override: true
});

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import Properties from './properties';
import './extensions/transform_in_dict';

import { mongooseBootstrap } from '#mongoose_bootstrap';
import { routeBootstrap } from '#route_bootstrap';
import { buildKcMain } from '#keycloak/singleton';
import { buildRedisMain, disconnectRedis } from '#redis/singleton';

const app = express();

export async function initializeServices(): Promise<void> {
    let isShuttingDown = false;

    try {
        await buildKcMain();
        await mongooseBootstrap();
        buildRedisMain();

        app.use(cors());
        app.use(express.json());

        app.use(express.json({ limit: '10MB' }));
        app.use(express.urlencoded({ extended: false }));

        await routeBootstrap(app);

        const server = app.listen(Number(Properties.port), '0.0.0.0', () => {
            console.log(`Application running on  ${Properties.port}`);
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

            // Fallback de segurança (ex: conexões presas)
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
