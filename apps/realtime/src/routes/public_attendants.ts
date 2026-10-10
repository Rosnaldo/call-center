import { type Application, type Request, type Response } from 'express';
import type { IOnlineUser } from '@repo/shared-types';
import type Redis from 'ioredis';
import { getRedisClient } from '../redis/singleton';
import { getOnlineUsersList } from '../services/online_users_redis';
import logger from '#logger';

// Same channel publishOnlineUsersBroadcast (services/realtime_events.ts) writes to.
const BROADCAST_CHANNEL = 'online-users:broadcast';
const HEARTBEAT_MS = 20_000;
// Anonymous connections are cheap but unbounded otherwise.
const MAX_CLIENTS = 500;

// What a visitor who isn't logged in may see of an attendant: no email, phone,
// slug or tokens (unlike /realtime-events/stream's update_online_users).
export interface PublicAttendant {
    id: string;
    name: string;
    avatarUrl?: string;
    role: IOnlineUser['role'];
    status: IOnlineUser['status'];
}

export const toPublicAttendants = (users: IOnlineUser[]): PublicAttendant[] =>
    users
        .filter((user) => user.role === 'attendant' || user.role === 'admin')
        .map(({ id, name, avatarUrl, role, status }) => ({ id, name, avatarUrl, role, status }));

const clients = new Set<Response>();
let subscriber: Redis | null = null;

const frame = (users: IOnlineUser[]): string =>
    `data: ${JSON.stringify({ event: 'update_online_attendants', data: { attendants: toPublicAttendants(users) } })}\n\n`;

// One Redis subscription shared by every anonymous stream, fanned out here,
// instead of a subscriber per connection like the authenticated stream.
async function ensureSubscriber(): Promise<void> {
    if (subscriber) return;
    const sub = getRedisClient().duplicate();
    subscriber = sub;
    sub.on('message', (_channel, message) => {
        try {
            const msg = JSON.parse(message) as { event?: string; data?: { users?: IOnlineUser[] } };
            if (msg.event !== 'update_online_users' || !Array.isArray(msg.data?.users)) return;
            const data = frame(msg.data.users);
            for (const res of clients) res.write(data);
        } catch {
            // malformed broadcast — ignore
        }
    });
    try {
        await sub.subscribe(BROADCAST_CHANNEL);
    } catch (error) {
        subscriber = null;
        sub.disconnect();
        throw error;
    }
}

export default (app: Application) => {
    // Public, read-only: the attendants online, for the home page's list.
    // Calling one still needs a login (and the authenticated streams).
    app.get('/public/attendants/stream', async (req: Request, res: Response) => {
        if (clients.size >= MAX_CLIENTS) {
            res.status(503).send('Too many connections');
            return;
        }

        try {
            await ensureSubscriber();
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            });
            res.flushHeaders?.();
            res.write(frame(await getOnlineUsersList()));
        } catch (error) {
            logger.error({ err: error }, 'public attendants stream: falha ao abrir');
            res.end();
            return;
        }

        clients.add(res);
        const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
        req.on('close', () => {
            clearInterval(heartbeat);
            clients.delete(res);
        });
    });
};
