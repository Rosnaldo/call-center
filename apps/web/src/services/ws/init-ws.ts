import { AuthenticatedWebSocket, TransportFactory, TRANSPORT_OPEN, createWsTransport } from './transport';
import { WsUsersService } from './users';
import { WsCallService } from './call';
import { WsMeetingService } from './meeting';
import type { OnlineUsersStoreInstance, IncomingCallStoreInstance, CallStoreInstance, CallViewStoreInstance } from '../../states/stores';
import properties from '../../properties';

const WS_URL = properties.realtimeWsUrl || undefined;
const RECONNECT_DELAY_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_ACK_TIMEOUT_MS = 10_000;

interface InitWsStores {
    onlineUsers: OnlineUsersStoreInstance;
    incomingCall: IncomingCallStoreInstance;
    call: CallStoreInstance;
    callView: CallViewStoreInstance;
}

export class InitWs {
    private usersService: WsUsersService | null = null;
    private callService: WsCallService | null = null;
    private meetingService: WsMeetingService | null = null;
    private activeWs: AuthenticatedWebSocket | null = null;
    private running = false;
    private factory: TransportFactory = createWsTransport;
    private readonly isSimulation = properties.isSimulation;

    private createAuthWs(token: string): AuthenticatedWebSocket {
        const transport = this.factory(`${WS_URL}?token=${token}`);
        return Object.assign(transport, { token });
    }

    private connect(
        ws: AuthenticatedWebSocket,
        usersService: WsUsersService,
        callService: WsCallService,
        meetingService: WsMeetingService,
    ): void {
        if (!this.running || !WS_URL) return;
        this.activeWs = ws;

        ws.onopen = () => {
            usersService.startHeartbeat(
                () => { if (ws.readyState === TRANSPORT_OPEN) ws.send(JSON.stringify({ event: 'heartbeat' })); },
                () => ws.close(),
                HEARTBEAT_INTERVAL_MS,
                HEARTBEAT_ACK_TIMEOUT_MS,
            );
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string);
                const data = 'data' in msg ? msg.data : undefined;
                console.log('ws: ', msg.event, data);
                usersService.handle(msg) || callService.handle(msg) || meetingService.handle(msg);
            } catch {
                // malformed frame — ignore
            }
        };

        ws.onerror = (err) => console.error('[WS] error', err);

        ws.onclose = () => {
            usersService.stopHeartbeat();
            if (!this.running) return;
            setTimeout(() => this.connect(this.createAuthWs(ws.token), usersService, callService, meetingService), RECONNECT_DELAY_MS);
        };
    }

    init(token: string | undefined, stores: InitWsStores, factory: TransportFactory = createWsTransport): void {
        if (!token) return;
        this.running = true;
        this.factory = factory;
        const usersService = new WsUsersService({ onlineUsers: stores.onlineUsers });
        const callService = new WsCallService({
            call: stores.call,
            callView: stores.callView,
            incomingCall: stores.incomingCall,
            onlineUsers: stores.onlineUsers,
        });
        const meetingService = new WsMeetingService({ call: stores.call });
        this.connect(this.createAuthWs(token), usersService, callService, meetingService);
    }

    notifyLogout(): void {
        if (this.isSimulation) return;
        if (this.activeWs?.readyState === TRANSPORT_OPEN) {
            this.activeWs.send(JSON.stringify({ event: 'user_logout' }));
        }
    }
}

export const initWs = new InitWs();
