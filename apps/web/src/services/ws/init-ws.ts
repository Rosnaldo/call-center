import { AuthenticatedWebSocket, TransportFactory, TRANSPORT_OPEN, createWsTransport } from './transport';
import { WsUsersService } from './users';
import { WsCallService } from './call';
import { WsMeetingService } from './meeting';
import { WsChatService } from './chat';
import type { OnlineUsersStoreInstance, IncomingCallStoreInstance, CallStoreInstance, CallViewStoreInstance, MeetingStoreInstance, ChatStoreInstance, CurrentUserStoreInstance } from '../../states/stores';
import properties from '../../properties';
import { mytoast } from '../../components/toast';
import authSession from '../../auth/session';

const WS_URL = properties.realtimeWsUrl || undefined;
const RECONNECT_DELAY_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_ACK_TIMEOUT_MS = 10_000;

interface InitWsStores {
    onlineUsers: OnlineUsersStoreInstance;
    incomingCall: IncomingCallStoreInstance;
    call: CallStoreInstance;
    callView: CallViewStoreInstance;
    meeting: MeetingStoreInstance;
    chat: ChatStoreInstance;
    currentUser: CurrentUserStoreInstance;
}

export class InitWs {
    private activeWs: AuthenticatedWebSocket | null = null;
    private running = false;
    private factory: TransportFactory = createWsTransport;

    private createAuthWs(token: string): AuthenticatedWebSocket {
        const transport = this.factory(`${WS_URL}?token=${token}`);
        return transport as AuthenticatedWebSocket;
    }

    private connect(
        ws: AuthenticatedWebSocket,
        usersService: WsUsersService,
        callService: WsCallService,
        meetingService: WsMeetingService,
        chatService: WsChatService,
        callStore: CallStoreInstance,
    ): void {
        if (!this.running || !WS_URL) return;
        this.activeWs = ws;

        ws.onopen = () => {
            authSession.getToken();
            usersService.startHeartbeat(
                () => { if (ws.readyState === TRANSPORT_OPEN) ws.send(JSON.stringify({ event: 'heartbeat' })); },
                () => ws.close(),
                HEARTBEAT_INTERVAL_MS,
                HEARTBEAT_ACK_TIMEOUT_MS,
            );
            // Re-syncs on every (re)connect, not just the first one — a
            // reconnect after our *own* socket dropped otherwise has nothing
            // telling this client to recheck its call state or rejoin Daily,
            // so it would sit in 'in-call' waiting forever with no video.
            callStore.getState().syncActiveCall();
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string);
                if (msg.isError) {
                    mytoast.error(msg.message);
                    this.running = false;
                    ws.close();
                    return;
                }
                usersService.handle(msg) || callService.handle(msg) || meetingService.handle(msg) || chatService.handle(msg);
            } catch {
                // malformed frame — ignore
            }
        };

        ws.onerror = (_err) => {
            mytoast.error('Connection error');
        };

        ws.onclose = () => {
            usersService.stopHeartbeat();
            if (!this.running) return;
            setTimeout(() => {
                authSession.getToken().then((token) => {
                    if (!token) return;
                    this.connect(this.createAuthWs(token), usersService, callService, meetingService, chatService, callStore);
                });
            }, RECONNECT_DELAY_MS);
        };
    }

    init(token: string | undefined, stores: InitWsStores, factory: TransportFactory = createWsTransport): void {
        if (!token) return;
        this.running = true;
        this.factory = factory;

        const usersService = new WsUsersService({ onlineUsers: stores.onlineUsers, call: stores.call, callView: stores.callView, currentUser: stores.currentUser, meeting: stores.meeting });
        const callService = new WsCallService({
            call: stores.call,
            callView: stores.callView,
            incomingCall: stores.incomingCall,
        });
        const meetingService = new WsMeetingService({ meeting: stores.meeting });
        const chatService = new WsChatService({ chat: stores.chat });

        this.connect(this.createAuthWs(token), usersService, callService, meetingService, chatService, stores.call);
    }

    notifyLogout(): void {
        if (this.activeWs?.readyState === TRANSPORT_OPEN) {
            this.activeWs.send(JSON.stringify({ event: 'user_logout' }));
        }
    }
}

export const initWs = new InitWs();
