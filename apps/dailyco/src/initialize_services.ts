import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
  override: true
});

import express from 'express';
import cors from 'cors';
import Properties from './properties';
import './extensions/transform_in_dict';
import { createWebSocketServer } from './websocket/main';


const app = express();

export async function initializeServices(): Promise<void> {
    let isShuttingDown = false;

    try {
        app.use(cors());
        app.use(express.json());

        app.use(express.json({ limit: '10MB' }));
        app.use(express.urlencoded({ extended: false }));

        const server = app.listen(Number(Properties.port), '0.0.0.0', () => {
            console.log(`Application running on  ${Properties.port}`);
        });

        createWebSocketServer(server);
        console.log('[WS] WebSocket server attached');

        const gracefulShutdown = async () => {
            if (isShuttingDown) return;
            isShuttingDown = true;

            server.close(() => {
                console.log(`[*] - WEB Service - Closed`);
                process.exit(0);
            });

            setTimeout(() => {
                console.error('Forçando shutdown após timeout');
                process.exit(1);
            }, 10_000);
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);
    } catch (error) {
        console.error('Error initializing services:', error);
        process.exit(1);
    }
}
