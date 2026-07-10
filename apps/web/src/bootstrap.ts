import type { Stores } from './states/stores.ts';
import { initWs } from './services/ws/init-ws.ts';
import { initCallEvents } from './services/sse/init-call-events.ts';

export async function bootstrap(stores: Stores): Promise<void> {
    await stores.auth.getState().bootstrap();
    const token = stores.auth.getState().token;
    initWs.init(token, stores);
    initCallEvents.init(token, stores);
}
