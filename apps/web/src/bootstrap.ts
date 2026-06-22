import type { Stores } from './states/stores.ts';
import type { DailyService } from './services/daily.ts';
import { initWs } from './services/init-ws.ts';

export async function bootstrap(stores: Stores, _dailyService: DailyService): Promise<void> {
    await stores.auth.getState().bootstrap();
    const token = stores.auth.getState().token;
    initWs.init(token, stores);
}
