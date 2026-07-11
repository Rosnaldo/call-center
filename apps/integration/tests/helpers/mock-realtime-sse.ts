import { getRedisClient } from '../../../realtime/src/redis/singleton';
import type { ISseSource, SseSourceFactory } from '../../../web/src/services/sse/init-call-events';

const CHANNEL_PREFIX = 'realtime-events:';
const BROADCAST_CHANNEL = 'online-users:broadcast';

// Realtime's counterpart to mock-sse.ts's createBridgedEventSource — bridges
// realtime's real Redis pub/sub channels into web's InitRealtimeEvents, the
// same way createBridgedClient bridges the real websocket connection handler
// into InitWs. Subscribes to both the per-user channel and the shared
// broadcast channel, matching exactly what the production SSE route
// (apps/realtime/src/routes/realtime_events.ts) does.
export async function createBridgedRealtimeEventSource(userId: string): Promise<{ factory: SseSourceFactory; messages: any[]; close: () => Promise<void> }> {
    const subscriber = getRedisClient().duplicate();
    const messages: any[] = [];
    let current: ISseSource | null = null;

    subscriber.on('message', (_channel, message) => {
        messages.push(JSON.parse(message));
        current?.onmessage?.({ data: message });
    });

    await Promise.all([
        subscriber.subscribe(`${CHANNEL_PREFIX}${userId}`),
        subscriber.subscribe(BROADCAST_CHANNEL),
    ]);

    const factory: SseSourceFactory = (_url: string): ISseSource => {
        const source: ISseSource = {
            onmessage: null,
            close: () => {},
        };
        current = source;
        return source;
    };

    const close = async (): Promise<void> => {
        current = null;
        await subscriber.unsubscribe().catch(() => {});
        subscriber.disconnect();
    };

    return { factory, messages, close };
}
