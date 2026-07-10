import type Redis from 'ioredis';
import { getRedisClient } from './singleton';
import { broadcastMessage } from '#websocket/broadcast';
import logger from '#logger';

// send/cancel/accept/complete on the incoming-call flow used to reach every
// connected client (not just the customer/attendant pair) through the old
// IAM-webhook handlers, so anyone else watching the online-users list (e.g.
// another customer picking an attendant) saw statuses flip live. IAM now
// publishes straight to Redis for the customer/attendant pair (see IAM's
// call_events.ts) instead of calling this webhook, but that broader
// broadcast still needs to happen — this subscribes to the one channel IAM
// publishes it on and relays it over the websocket exactly as before.
const CHANNEL = 'online-users:broadcast';

let subscriber: Redis | null = null;

export async function subscribeOnlineUsersBroadcast(): Promise<void> {
    subscriber = getRedisClient().duplicate();
    subscriber.on('message', () => {
        broadcastMessage({ event: 'online_users_broadcast', data: {} });
    });
    await subscriber.subscribe(CHANNEL);
    logger.info('subscribed to online-users:broadcast');
}

export async function unsubscribeOnlineUsersBroadcast(): Promise<void> {
    if (!subscriber) return;
    await subscriber.unsubscribe().catch(() => {});
    subscriber.disconnect();
    subscriber = null;
}
