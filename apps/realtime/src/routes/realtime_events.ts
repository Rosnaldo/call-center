import { type Application, type Response } from 'express';
import { getRedisClient } from '../redis/singleton';
import { authenticateFromQuery } from '../middleware/authenticate_from_query';
import { AuthenticatedRequest } from '../middleware/authenticate';
import logger from '#logger';

const CHANNEL_PREFIX = 'realtime-events:';
const BROADCAST_CHANNEL = 'online-users:broadcast';
// Keeps proxies/load balancers from treating the connection as idle and
// closing it — EventSource ignores unrecognized SSE fields, so a bare
// comment line is enough and never reaches application code as a message.
const HEARTBEAT_MS = 20_000;

export default (app: Application) => {
    // Token travels as a query param, not the Authorization header — the
    // browser's EventSource API can't send custom headers (see
    // authenticate_from_query.ts). Realtime's session/presence/chat
    // notifications (see services/realtime_events.ts) publish here instead
    // of pushing over the websocket, which now carries only heartbeat
    // traffic.
    app.get(
        '/realtime-events/stream',
        authenticateFromQuery,
        async (req: AuthenticatedRequest, res: Response) => {
            const userId = String(req.authUser!._id);
            const channel = `${CHANNEL_PREFIX}${userId}`;
            const subscriber = getRedisClient().duplicate();
            let heartbeat: ReturnType<typeof setInterval> | undefined;

            const cleanup = () => {
                clearInterval(heartbeat);
                subscriber.unsubscribe().catch(() => {});
                subscriber.disconnect();
            };

            try {
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                });
                res.flushHeaders?.();

                subscriber.on('message', (_channel, message) => {
                    res.write(`data: ${message}\n\n`);
                });

                await Promise.all([
                    subscriber.subscribe(channel),
                    subscriber.subscribe(BROADCAST_CHANNEL),
                ]);
            } catch (error) {
                logger.error({ err: error, userId }, 'realtime_events stream: falha ao assinar canal Redis');
                cleanup();
                res.end();
                return;
            }

            heartbeat = setInterval(() => {
                res.write(': ping\n\n');
            }, HEARTBEAT_MS);

            req.on('close', cleanup);
        },
    );
};
