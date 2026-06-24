import express from 'express';
import http from 'http';
import cors from 'cors';
import { Properties } from './properties';
import { ISocketServer } from './websocket/socket';

class InitializeServices {
    private static instance: InitializeServices;

    app = express();
    server: http.Server | null = null;
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

            const port = this.properties.nodeEnv === 'test' ? 0 : Number(this.properties.port);

            this.server = await new Promise<http.Server>((resolve) => {
                const s = this.app.listen(port, '0.0.0.0', () => {
                    const addr = s.address();
                    const boundPort = typeof addr === 'object' ? addr!.port : port;
                    this.properties.port = boundPort;
                    console.log(`Realtime running on  ${boundPort}`);
                    resolve(s);
                });
            });

            if (this.properties.nodeEnv === 'test') return;

            const { createWebSocketServer } = await import('./websocket/main');
            const wss = createWebSocketServer(this.server);
            this.setupWebhooks(wss);
            console.log('[WS] WebSocket server attached');

            const gracefulShutdown = async () => {
                if (isShuttingDown) return;
                isShuttingDown = true;

                this.server!.close(() => {
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

    async stop(): Promise<void> {
        if (this.server) {
            await new Promise<void>((resolve) => this.server!.close(() => resolve()));
            this.server = null;
        }
    }
}

export { InitializeServices };
