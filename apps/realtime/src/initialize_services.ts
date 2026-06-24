import express from 'express';
import cors from 'cors';
import { Properties } from './properties';
import { ISocketServer } from './websocket/socket';

class InitializeServices {
    private static instance: InitializeServices;

    app = express();
    properties: Properties;
    wss: ISocketServer | null = null;

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

    setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.json({ limit: '10MB' }));
        this.app.use(express.urlencoded({ extended: false }));
    }

    setupWebhooks(wss: ISocketServer): void {
        this.wss = wss;
        const dailyWebhook = require('./webhooks/daily').default;
        const iamWebhook = require('./webhooks/iam').default;
        dailyWebhook(this.app, wss);
        iamWebhook(this.app, wss);
    }

    async start(): Promise<void> {
        let isShuttingDown = false;

        try {
            this.setupMiddleware();

            if (this.properties.nodeEnv === 'test') return;

            const { createWebSocketServer } = await import('./websocket/main');

            const server = this.app.listen(Number(this.properties.port), '0.0.0.0', () => {
                console.log(`Application running on  ${this.properties.port}`);
            });

            const wss = createWebSocketServer(server);
            this.setupWebhooks(wss);
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
}

export { InitializeServices };
