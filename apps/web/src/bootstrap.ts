import { useAuthStore } from './states/auth/store.ts';
import './states/current-user/store.ts';
import './states/online-users/store.ts';
import './states/timer/store.ts';
import './states/call/store.ts';
import './states/call-view/store.ts';
import { initWs } from './services/init-ws.ts';

export async function bootstrap(): Promise<void> {
    await useAuthStore.getState().bootstrap();
    const token = useAuthStore.getState().token;
    initWs.init(token);
}
