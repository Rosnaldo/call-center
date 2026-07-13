import { type Application, type Response } from 'express';
import { getRedisClient } from '../redis/singleton';
import { authenticateFromQuery } from '../middleware/authenticate_from_query';
import { AuthenticatedRequest } from '../middleware/authenticate';
import logger from '#logger';

const CHANNEL_PREFIX = 'call-events:';
// Keeps proxies/load balancers from treating the connection as idle and
// closing it — EventSource ignores unrecognized SSE fields, so a bare
// comment line is enough and never reaches application code as a message.
const HEARTBEAT_MS = 20_000;

export default (app: Application) => {
    // Token travels as a query param, not the Authorization header — the
    // browser's EventSource API can't send custom headers (see
    // authenticate_from_query.ts). IAM still owns the call/incomingCall
    // domain and publishes straight to this same Redis channel (see
    // apps/iam/src/services/call_events.ts) — moving the stream itself here
    // just centralizes every client-facing WebSocket/SSE connection on
    // realtime, so IAM stays a plain HTTP API and can be redeployed without
    // dropping anyone's live stream.
    app.get(
        '/call-events/stream',
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
