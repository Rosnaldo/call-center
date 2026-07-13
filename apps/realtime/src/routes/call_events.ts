import { type Application, type Response } from 'express';
import { getRedisClient } from '../redis/singleton';
import { authenticateFromQuery } from '../middleware/authenticate_from_query';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { getCallByUser } from '../services/calls_redis';
import logger from '#logger';

const CHANNEL_PREFIX = 'call-events:';
// Keeps proxies/load balancers from treating the connection as idle and
// closing it — EventSource ignores unrecognized SSE fields, so a bare
// comment line is enough and never reaches application code as a message.
const HEARTBEAT_MS = 20_000;

export default (app: Application) => {
    // Token travels as a query param, not the Authorization header — the
    // browser's EventSource API can't send custom headers (see
    // authenticate_from_query.ts). IAM still owns incomingCall and the
    // business-logic call writes (add/remove-participant, complete,
    // sync-active-call), publishing straight to this same Redis channel (see
    // apps/iam/src/services/call_events.ts); realtime publishes to it too now
    // for the plain-CRUD call writes it owns directly (see
    // services/call_events.ts) — same shared-channel pattern as
    // online-users:broadcast.
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

                // Full snapshot right away — same reasoning as
                // realtime-events.ts: a freshly-opened connection has no REST
                // call to fall back on for the current call state anymore.
                const call = await getCallByUser(userId);
                res.write(`data: ${JSON.stringify({ event: 'update_call', data: { call } })}\n\n`);
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
