import express from 'express';
import http from 'http';
import cors from 'cors';
import logger from '#logger';
import { traceMiddleware } from './middleware/trace';
import { Properties } from './properties';
import { buildKcMain } from './keycloak/singleton';
import { registerDailyWebhooks, cleanupDailyWebhooks } from './webhooks/daily_manager';

class WebhookServer {
    private static instance: WebhookServer;

    app = express();
    server: http.Server | null = null;
    properties: Properties;

    private constructor(properties: Properties) {
        this.properties = properties;
    }

    static getInstance(properties?: Properties): WebhookServer {
        if (!WebhookServer.instance) {
            WebhookServer.instance = new WebhookServer(
                properties ?? Properties.getInstance()
            );
        }
        return WebhookServer.instance;
    }

    static reset(): void {
        WebhookServer.instance = undefined as unknown as WebhookServer;
    }

    setupMiddleware(): void {
        this.app.use(cors({
            origin: this.properties.corsOrigins,
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }));
        this.app.use(traceMiddleware);
        this.app.use(express.json());
        this.app.use(express.json({ limit: '10MB' }));
        this.app.use(express.urlencoded({ extended: false }));
    }

    setupRoutes(): void {
        const health = require('./routes/health').default;
        health(this.app);
    }

    setupWebhooks(): void {
        const dailyWebhook = require('./webhooks/daily').default;
        const iamWebhook = require('./webhooks/iam').default;
        dailyWebhook(this.app);
        iamWebhook(this.app);
    }

    async start(): Promise<void> {
        await buildKcMain();
        this.setupMiddleware();
        this.setupRoutes();

        const port = this.properties.nodeEnv === 'test' ? 0 : Number(this.properties.port);

        this.server = await new Promise<http.Server>((resolve) => {
            const s = this.app.listen(port, '0.0.0.0', () => {
                const addr = s.address();
                const boundPort = typeof addr === 'object' ? addr!.port : port;
                this.properties.port = boundPort;
                logger.info({ port: boundPort }, 'webhook server running');
                resolve(s);
            });
        });

        if (this.properties.nodeEnv !== 'test') {
            this.setupWebhooks();
        }
    }

    async stop(): Promise<void> {
        if (this.server) {
            await new Promise<void>((resolve) => this.server!.close(() => resolve()));
            this.server = null;
        }
    }
}

class WsServer {
    private static instance: WsServer;

    server: http.Server;

    private constructor(server: http.Server) {
        this.server = server;
    }

    static getInstance(server: http.Server): WsServer {
        if (!WsServer.instance) {
            WsServer.instance = new WsServer(server);
        }
        return WsServer.instance;
    }

    static reset(): void {
        WsServer.instance = undefined as unknown as WsServer;
    }

    async start(): Promise<void> {
        const { createWebSocketServer } = await import('./websocket/main');
        createWebSocketServer(this.server);
        logger.info('websocket server attached');
    }
}

async function startAll(properties?: Properties): Promise<WebhookServer> {
    const webhookServer = WebhookServer.getInstance(properties);
    await webhookServer.start();

    if (webhookServer.properties.nodeEnv !== 'test') {
        const wsServer = WsServer.getInstance(webhookServer.server!);
        await wsServer.start();

        try {
            await registerDailyWebhooks();
        } catch (error) {
            logger.error(error, 'falha ao registrar webhooks do daily');
        }

        let isShuttingDown = false;
        const gracefulShutdown = async () => {
            if (isShuttingDown) return;
            isShuttingDown = true;

            try {
                await cleanupDailyWebhooks()
            } catch (error) {
                logger.error(error, 'falha ao limpar webhooks/rooms do daily');
            }

            webhookServer.server!.close(() => {
                logger.info('web service closed');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('Forçando shutdown após timeout');
                process.exit(1);
            }, 10_000);
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);
    }

    return webhookServer;
}

export { WebhookServer, WsServer, startAll };
