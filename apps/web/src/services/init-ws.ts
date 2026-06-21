import { IOnlineUser, IncomingCallState } from '@repo/shared-types';
import { AuthenticatedWebSocket, TransportFactory, TRANSPORT_OPEN, createWsTransport } from './transport';
import type { OnlineUsersStoreInstance, IncomingCallStoreInstance } from '../states/stores';

const WS_URL = import.meta.env.VITE_REALTIME_WS_URL as string | undefined;
const RECONNECT_DELAY_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_ACK_TIMEOUT_MS = 10_000;

interface InitWsStores {
    onlineUsers: OnlineUsersStoreInstance;
    incomingCall: IncomingCallStoreInstance;
}

type WsInboundMessage =
    | { event: 'online_users_updated'; data: IOnlineUser }
    | { event: 'heartbeat_ack' }
    | { event: 'user_logout'; data: { id: string } }
    | { event: 'send_incoming_call'; data: { incomingCall: IncomingCallState } }
    | { event: 'call_cancelled'; data: { targetUserId: string } };

export type IncomingCallPayload = IncomingCallState;

class InitWs {
    private heartbeatRef: ReturnType<typeof setInterval> | null = null;
    private ackRef: ReturnType<typeof setTimeout> | null = null;
    private activeWs: AuthenticatedWebSocket | null = null;
    private running = false;
    private factory: TransportFactory = createWsTransport;
    private stores: InitWsStores | null = null;
    private readonly isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';

    private startHeartbeat(onTick: () => void): void {
        if (this.heartbeatRef) return;
        this.heartbeatRef = setInterval(onTick, HEARTBEAT_INTERVAL_MS);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatRef) clearInterval(this.heartbeatRef);
        this.heartbeatRef = null;
    }

    private armAck(onTimeout: () => void): void {
        if (this.ackRef) clearTimeout(this.ackRef);
        this.ackRef = setTimeout(onTimeout, HEARTBEAT_ACK_TIMEOUT_MS);
    }

    private cancelAck(): void {
        if (this.ackRef) clearTimeout(this.ackRef);
        this.ackRef = null;
    }

    private createAuthWs(token: string): AuthenticatedWebSocket {
        const transport = this.factory(`${WS_URL}?token=${token}`);
        return Object.assign(transport, { token });
    }

    private connect(ws: AuthenticatedWebSocket): void {
        if (!this.running || !WS_URL) return;
        this.activeWs = ws;

        ws.onopen = () => {
            this.startHeartbeat(() => {
                if (ws.readyState !== TRANSPORT_OPEN) return;
                ws.send(JSON.stringify({ event: 'heartbeat' }));
                this.armAck(() => ws.close());
            });
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string) as WsInboundMessage;
                const { upsertUser, removeUser } = this.stores!.onlineUsers.getState();
                const { clearIncomingCall, setIncomingCall } = this.stores!.incomingCall.getState();
                switch (msg.event) {
                    case 'online_users_updated':
                        upsertUser(msg.data);
                        break;
                    case 'heartbeat_ack':
                        this.cancelAck();
                        break;
                    case 'user_logout':
                        removeUser(msg.data.id);
                        break;
                    case 'send_incoming_call':
                        setIncomingCall?.(msg.data.incomingCall);
                        break;
                    case 'call_cancelled':
                        clearIncomingCall?.();
                        break;
                }
            } catch {
                // malformed frame — ignore
            }
        };

        ws.onerror = (err) => console.error('[WS] error', err);

        ws.onclose = () => {
            this.stopHeartbeat();
            this.cancelAck();
            if (!this.running) return;
            setTimeout(() => this.connect(this.createAuthWs(ws.token)), RECONNECT_DELAY_MS);
        };
    }

    init(token: string | undefined, stores: InitWsStores, factory: TransportFactory = createWsTransport): void {
        if (!token) return;
        this.running = true;
        this.stores = stores;
        this.factory = factory;
        this.connect(this.createAuthWs(token));
    }

    notifyLogout(): void {
        if (this.isSimulation) return;
        if (this.activeWs?.readyState === TRANSPORT_OPEN) {
            this.activeWs.send(JSON.stringify({ event: 'user_logout' }));
        }
    }

    notifyIncomingCall(targetUserId: string, incomingCall: IncomingCallState): void {
        if (this.isSimulation) return;
        if (this.activeWs?.readyState === TRANSPORT_OPEN) {
            this.activeWs.send(JSON.stringify({ event: 'send_incoming_call', data: { targetUserId, incomingCall } }));
        }
    }

    notifyCancelCall(targetUserId: string): void {
        if (this.isSimulation) return;
        if (this.activeWs?.readyState === TRANSPORT_OPEN) {
            this.activeWs.send(JSON.stringify({ event: 'call_cancelled', data: { targetUserId } }));
        }
    }
}

export const initWs = new InitWs();
