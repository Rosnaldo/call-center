import { getRedisClient } from '../../../iam/src/redis/singleton';
import type { ISseSource, SseSourceFactory } from '../../../web/src/services/sse/init-call-events';

const CHANNEL_PREFIX = 'call-events:';

// Bridges IAM's real Redis pub/sub channel into web's InitCallEvents the same
// way createBridgedClient bridges realtime's real websocket connection handler
// into InitWs — a duplicated real ioredis subscriber (mirroring what the SSE
// route itself does) stands in for the browser's EventSource, so the actual
// production dispatch logic in init-call-events.ts still runs end to end.
// `messages` mirrors the customerMessages/attendantMessages arrays the
// websocket-bridged tests already use, but sourced from this channel instead.
export async function createBridgedEventSource(userId: string): Promise<{ factory: SseSourceFactory; messages: any[]; close: () => Promise<void> }> {
    const subscriber = getRedisClient().duplicate();
    const messages: any[] = [];
    let current: ISseSource | null = null;

    subscriber.on('message', (_channel, message) => {
        messages.push(JSON.parse(message));
        current?.onmessage?.({ data: message });
    });

    await subscriber.subscribe(`${CHANNEL_PREFIX}${userId}`);

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
