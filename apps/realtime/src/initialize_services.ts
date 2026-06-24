import express from 'express';
import cors from 'cors';
import { Properties } from './properties';
import './extensions/transform_in_dict';
import { createWebSocketServer } from './websocket/main';
import dailyWebhook from './webhooks/daily';
import iamWebhook from './webhooks/iam';

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
            this.app.use(cors());
            this.app.use(express.json());

            this.app.use(express.json({ limit: '10MB' }));
            this.app.use(express.urlencoded({ extended: false }));

            const server = this.app.listen(Number(this.properties.port), '0.0.0.0', () => {
                console.log(`Application running on  ${this.properties.port}`);
            });

            const wss = createWebSocketServer(server);
            console.log('[WS] WebSocket server attached');

            dailyWebhook(this.app, wss);
            iamWebhook(this.app, wss);

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
}

export { InitializeServices };
