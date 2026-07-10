import { type Application, type Request, type Response } from 'express';
import { getRedisClient } from '#redis/singleton';
import { GetKeycloakUserFromQuery } from '#middleware/get_keycloak_user_from_query';
import { GetUser } from '#middleware/get_user';
import logger from '#logger';

const CHANNEL_PREFIX = 'call-events:';
// Keeps proxies/load balancers from treating the connection as idle and
// closing it — EventSource ignores unrecognized SSE fields, so a bare
// comment line is enough and never reaches application code as a message.
const HEARTBEAT_MS = 20_000;

export default (app: Application) => {
    // Token travels as a query param, not the Authorization header — the
    // browser's EventSource API can't send custom headers (see
    // GetKeycloakUserFromQuery). Replaces the old IAM-webhook-to-realtime
    // push for the send/cancel/accept/complete call flow: web subscribes to
    // this directly instead of over the realtime websocket.
    app.get(
        '/call-events/stream',
        GetKeycloakUserFromQuery,
        GetUser,
        async (req: Request, res: Response) => {
            const userId = String(req.user._id);
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

                await subscriber.subscribe(channel);
            } catch (error) {
                logger.error({ err: error, userId }, 'call_events stream: falha ao assinar canal Redis');
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
