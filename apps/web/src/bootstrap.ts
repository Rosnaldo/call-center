import type { Stores } from './states/stores.ts';
import { initWs } from './services/ws/init-ws.ts';

export async function bootstrap(stores: Stores): Promise<void> {
    await stores.auth.getState().bootstrap();
    const token = stores.auth.getState().token;
    initWs.init(token, stores);
    await stores.call.getState().rejoinActiveCall();
}
