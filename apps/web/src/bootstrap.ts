import { useAuthStore } from './states/auth/store.ts';
import './states/current-user/store.ts';
import './states/online-users/store.ts';
import './states/timer/store.ts';
import './states/call/store.ts';
import './components/call-lobby-view/states/store.ts';
import { initOnlineUsersWebSocket } from './services/online-users-ws.ts';

export function bootstrap(): void {
    useAuthStore.getState().bootstrap();
    initOnlineUsersWebSocket();
}
