import { useAuthStore } from './states/stores.ts';
import { initWs } from './services/init-ws.ts';

export async function bootstrap(): Promise<void> {
    await useAuthStore.getState().bootstrap();
    const token = useAuthStore.getState().token;
    initWs.init(token);
}
