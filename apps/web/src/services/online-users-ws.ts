import { IOnlineUser, IncomingCallState } from '@repo/shared-types';
import { useOnlineUsersStore } from '../states/online-users/store';
import { ITransport, TransportFactory, TRANSPORT_OPEN, createWsTransport } from './transport';
import { useIncomingCallStore } from '../states/incoming-call/store';

const WS_URL = import.meta.env.VITE_REALTIME_WS_URL as string | undefined;
const RECONNECT_DELAY_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_ACK_TIMEOUT_MS = 10_000;

type WsInboundMessage =
    | { event: 'online_users_updated'; data: IOnlineUser }
    | { event: 'heartbeat_ack' }
    | { event: 'user_logout'; data: { id: string } }
    | { event: 'incoming_call'; data: { targetUserId: string, call: IncomingCallState } }
    | { event: 'call_cancelled'; data: { targetUserId: string } };

let _heartbeatRef: ReturnType<typeof setInterval> | null = null;

const heartbeat = {
    start(onTick: () => void): void {
        if (_heartbeatRef) return;
        _heartbeatRef = setInterval(onTick, HEARTBEAT_INTERVAL_MS);
    },
    stop(): void {
        if (_heartbeatRef) clearInterval(_heartbeatRef);
        _heartbeatRef = null;
    },
};

let _ackRef: ReturnType<typeof setTimeout> | null = null;

const ackTimer = {
    arm(onTimeout: () => void): void {
        if (_ackRef) clearTimeout(_ackRef);
        _ackRef = setTimeout(onTimeout, HEARTBEAT_ACK_TIMEOUT_MS);
    },
    cancel(): void {
        if (_ackRef) clearTimeout(_ackRef);
        _ackRef = null;
    },
};

export type IncomingCallPayload = IncomingCallState;

let activeWs: ITransport | null = null;
let running = false;

export function notifyWsLogout(): void {
    if (activeWs?.readyState === TRANSPORT_OPEN) {
        activeWs.send(JSON.stringify({ event: 'user_logout' }));
    }
}

export function notifyWsIncomingCall(targetUserId: string, incomingCall: IncomingCallState): void {
    if (activeWs?.readyState === TRANSPORT_OPEN) {
        activeWs.send(JSON.stringify({ event: 'incoming_call', data: { targetUserId, incomingCall } }));
    }
}

export function notifyWsCancelCall(targetUserId: string): void {
    if (activeWs?.readyState === TRANSPORT_OPEN) {
        activeWs.send(JSON.stringify({ event: 'call_cancelled', data: { targetUserId } }));
    }
}

function connect(token: string, factory: TransportFactory) {
    if (!running || !WS_URL) return;

    const transport = factory(`${WS_URL}?token=${token}`);
    activeWs = transport;

    transport.onopen = () => {
        heartbeat.start(() => {
            if (transport.readyState !== TRANSPORT_OPEN) return;
            transport.send(JSON.stringify({ event: 'heartbeat' }));
            ackTimer.arm(() => transport.close());
        });
    };

    transport.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data as string) as WsInboundMessage;
            const { upsertUser, removeUser } = useOnlineUsersStore.getState();
            const { clearIncomingCall, setIncomingCall } = useIncomingCallStore.getState();
            switch (msg.event) {
                case 'online_users_updated':
                    upsertUser(msg.data);
                    break;
                case 'heartbeat_ack':
                    ackTimer.cancel();
                    break;
                case 'user_logout':
                    removeUser(msg.data.id);
                    break;
                case 'incoming_call':
                    setIncomingCall?.(msg.data.call);
                    break;
                case 'call_cancelled':
                    clearIncomingCall?.();
                    break;
            }
        } catch {
            // malformed frame — ignore
        }
    };

    transport.onerror = (err) => console.error('[WS] error', err);

    transport.onclose = () => {
        heartbeat.stop();
        ackTimer.cancel();
        if (!running) return;
        setTimeout(() => connect(token, factory), RECONNECT_DELAY_MS);
    };
}

export function initOnlineUsersWebSocket(
    token: string | undefined,
    factory: TransportFactory = createWsTransport,
): void {
    if (!token) return;
    running = true;
    connect(token, factory);
}
