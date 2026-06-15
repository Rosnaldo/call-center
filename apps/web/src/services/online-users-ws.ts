import { IOnlineUser } from '@repo/shared-types';
import { useAuthStore } from '../states/auth/store';
import { useOnlineUsersStore } from '../states/online-users/store';

const WS_URL = import.meta.env.VITE_REALTIME_WS_URL as string | undefined;
const RECONNECT_DELAY_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_ACK_TIMEOUT_MS = 10_000;

type WsInboundMessage =
    | { event: 'online_users_updated'; data: IOnlineUser }
    | { event: 'heartbeat_ack' }
    | { event: 'user_logout'; data: { id: string } };

let activeWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let ackTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;

export function notifyWsLogout(): void {
    if (activeWs?.readyState === WebSocket.OPEN) {
        activeWs.send(JSON.stringify({ event: 'user_logout' }));
    }
}

function clearHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (ackTimer) clearTimeout(ackTimer);
    heartbeatInterval = null;
    ackTimer = null;
}

function disconnect() {
    running = false;
    clearHeartbeat();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    activeWs?.close();
    activeWs = null;
}

function connect(token: string) {
    if (!running || !WS_URL) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    activeWs = ws;

    ws.onopen = () => {
        heartbeatInterval = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({ event: 'heartbeat' }));
            ackTimer = setTimeout(() => ws.close(), HEARTBEAT_ACK_TIMEOUT_MS);
        }, HEARTBEAT_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data as string) as WsInboundMessage;
            const { upsertUser, removeUser } = useOnlineUsersStore.getState();
            switch (msg.event) {
                case 'online_users_updated':
                    upsertUser(msg.data);
                    break;
                case 'heartbeat_ack':
                    if (ackTimer) clearTimeout(ackTimer);
                    ackTimer = null;
                    break;
                case 'user_logout':
                    removeUser(msg.data.id);
                    break;
            }
        } catch {
            // malformed frame — ignore
        }
    };

    ws.onerror = (err) => console.error('[WS] error', err);

    ws.onclose = () => {
        clearHeartbeat();
        if (!running) return;
        reconnectTimer = setTimeout(() => connect(token), RECONNECT_DELAY_MS);
    };
}

export function initOnlineUsersWebSocket(): void {
    useAuthStore.subscribe((state, prev) => {
        if (state.token === prev.token) return;
        disconnect();
        if (state.token) {
            running = true;
            connect(state.token);
        }
    });
}
