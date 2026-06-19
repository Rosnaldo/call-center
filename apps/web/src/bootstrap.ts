import { useAuthStore } from './states/auth/store.ts';
import './states/current-user/store.ts';
import './states/online-users/store.ts';
import './states/timer/store.ts';
import './states/call/store.ts';
import './components/call-lobby-view/states/store.ts';
import { initOnlineUsersWebSocket } from './services/online-users-ws.ts';

export async function bootstrap(): Promise<void> {
    await useAuthStore.getState().bootstrap();
    const token = useAuthStore.getState().token;
    initOnlineUsersWebSocket(
        token,
        undefined,
    );
}
