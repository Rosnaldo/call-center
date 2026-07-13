import { AuthenticatedWebSocket, TransportFactory, TRANSPORT_OPEN, createWsTransport } from './transport';
import { WsUsersService } from './users';
import type { CallViewStoreInstance } from '../../states/stores';
import properties from '../../properties';
import { mytoast } from '../../components/toast';
import authSession from '../../auth/session';
import { resetCallState } from '../../states/reset-call-state';

const WS_URL = properties.realtimeWsUrl || undefined;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_ACK_TIMEOUT_MS = 10_000;
// One real socket per browser instead of one per tab: tabs race for this
// lock, the winner opens the socket, and the rest fall back to
// listenAsFollower below. Never resolved on purpose — the lock (and the
// leader role) is only released when the tab closes/crashes, at which point
// the browser hands it to the next waiting tab automatically.
const LEADER_LOCK_NAME = 'call-center-ws-leader';
const RELAY_CHANNEL_NAME = 'call-center-ws-relay';

interface InitWsStores {
    callView: CallViewStoreInstance;
}

type RelayMessage =
    // leader -> followers: a message that arrived on the real socket
    | { type: 'ws-message'; payload: any }
    // any tab -> leader: something to forward over the real socket
    | { type: 'ws-send'; payload: any };

export class InitWs {
    private activeWs: AuthenticatedWebSocket | null = null;
    private running = false;
    private factory: TransportFactory = createWsTransport;
    private reconnectAttempts = 0;
    private channel: BroadcastChannel | null = null;
    private lockAbort: AbortController | null = null;

    private createAuthWs(): AuthenticatedWebSocket {
        const transport = this.factory(`${WS_URL}`);
        return transport as AuthenticatedWebSocket;
    }

    // Full-jitter exponential backoff (AWS Architecture Blog): spreads
    // reconnect attempts out so a server restart doesn't get hit by every
    // client reconnecting at the same instant.
    private nextReconnectDelay(): number {
        const cap = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts);
        this.reconnectAttempts += 1;
        return Math.random() * cap;
    }

    private connect(
        ws: AuthenticatedWebSocket,
        token: string,
        callViewStore: CallViewStoreInstance,
        usersService: WsUsersService,
    ): void {
        if (!this.running || !WS_URL) return;
        this.activeWs = ws;
        // connect() only ever runs for the tab that actually holds the real
        // socket — see becomeLeader/init() below — so reaching here means
        // this tab is the leader. Stored reactively so React components (not
        // just WsUsersService) can key off it — see CallFooter/CallFooterActions.
        callViewStore.getState().setIsLeader(true);
        let authenticated = false;

        ws.onopen = () => {
            authSession.getToken();
            // Token travels as the first message instead of a `?token=` URL
            // query param, so it doesn't end up in proxy/CDN access logs or
            // browser history. Heartbeat only starts once the server confirms
            // auth (see onmessage) — see connection.ts on the realtime side.
            ws.send(JSON.stringify({ event: 'auth', token }));
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
                if (!authenticated) {
                    authenticated = true;
                    this.reconnectAttempts = 0;
                    usersService.startHeartbeat(
                        () => { if (ws.readyState === TRANSPORT_OPEN) ws.send(JSON.stringify({ event: 'heartbeat' })); },
                        () => ws.close(),
                        HEARTBEAT_INTERVAL_MS,
                        HEARTBEAT_ACK_TIMEOUT_MS,
                    );
                }
                usersService.handle(msg);
                this.channel?.postMessage({ type: 'ws-message', payload: msg } satisfies RelayMessage);
            } catch {
                // malformed frame — ignore
            }
        };

        ws.onerror = (_err) => {
            mytoast.error('Connection error');
        };

        ws.onclose = () => {
            usersService.stopHeartbeat();
            // Losing the socket means we stop receiving realtime-events SSE
            // reconnection isn't affected (that's a separate connection —
            // see init-realtime-events.ts), but the call domain resyncs via
            // IAM's call_synced on the next connect, so drop any stale call
            // state now rather than leave it to go stale.
            resetCallState();
            if (!this.running) return;
            const delay = this.nextReconnectDelay();
            setTimeout(() => {
                authSession.getToken().then((freshToken) => {
                    if (!freshToken) return;
                    this.connect(this.createAuthWs(), freshToken, callViewStore, usersService);
                });
            }, delay);
        };
    }

    // Runs in every tab regardless of leader/follower role. Leader tabs never
    // receive their own postMessage (BroadcastChannel doesn't echo back to the
    // sender), so this only ever does something in followers: apply relayed
    // server messages to this tab's own stores, and forward this tab's
    // outgoing sends (see notifyLogout) through whichever tab is the leader.
    private listenAsFollower(usersService: WsUsersService): void {
        if (!this.channel) return;
        this.channel.onmessage = (event: MessageEvent<RelayMessage>) => {
            const data = event.data;
            if (data.type === 'ws-message') {
                usersService.handle(data.payload);
                return;
            }
            if (data.type === 'ws-send' && this.activeWs?.readyState === TRANSPORT_OPEN) {
                this.activeWs.send(JSON.stringify(data.payload));
            }
        };
    }

    private async becomeLeader(
        callViewStore: CallViewStoreInstance,
        usersService: WsUsersService,
    ): Promise<void> {
        // Lock acquisition can be queued a long time behind whichever tab was
        // leader before us, so the token captured at init() time may be
        // stale — fetch a fresh one right before actually opening the socket.
        const freshToken = await authSession.getToken();
        if (!freshToken || !this.running) return;
        this.reconnectAttempts = 0;
        this.connect(this.createAuthWs(), freshToken, callViewStore, usersService);
    }

    init(token: string | undefined, stores: InitWsStores, factory: TransportFactory = createWsTransport): void {
        if (!token) return;
        this.running = true;
        this.factory = factory;
        this.reconnectAttempts = 0;
        stores.callView.getState().setIsLeader(false);
        // Re-init (e.g. re-login in the same tab) must not leave the old
        // channel's listener around — BroadcastChannel instances of the same
        // name all receive each other's messages, so a stale one left open
        // would keep reacting to relayed messages with services bound to the
        // previous init()'s stores.
        this.channel?.close();
        this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(RELAY_CHANNEL_NAME) : null;

        const usersService = new WsUsersService();

        this.listenAsFollower(usersService);

        // Checking `window`/`document` and not just `navigator.locks` matters
        // here: this coordination only makes sense between actual browser
        // tabs, and some non-browser runtimes (e.g. Node 24+) now expose a
        // same-shaped `navigator.locks` with different lifetime semantics —
        // a lock there isn't tied to anything like a tab closing, so it can
        // outlive the code that acquired it. Anywhere that isn't a real
        // browser (older browsers too, missing the API entirely) just acts
        // as leader directly, same as before this tab-coordination existed.
        const hasBrowserLocks = typeof window !== 'undefined' && typeof document !== 'undefined'
            && typeof navigator !== 'undefined' && !!navigator.locks;
        if (!hasBrowserLocks) {
            this.connect(this.createAuthWs(), token, stores.callView, usersService);
            return;
        }

        // A tab can call init() more than once (e.g. logout then a fresh
        // login without a page reload — see useLogout.ts). `signal` only
        // cancels the request while it's still queued though — once a
        // request is granted, aborting it does nothing on its own, so a
        // previous init() holding the lock via the never-resolving promise
        // below would keep holding it forever. Resolving that promise
        // ourselves on 'abort' is what actually releases it, letting the
        // next init()'s request be granted right after.
        this.lockAbort?.abort();
        const abortController = new AbortController();
        this.lockAbort = abortController;

        navigator.locks.request(LEADER_LOCK_NAME, { signal: abortController.signal }, () => new Promise<void>((resolve) => {
            abortController.signal.addEventListener('abort', () => resolve());
            this.becomeLeader(stores.callView, usersService);
        })).catch(() => {
            // Aborted while still queued (a subsequent init() call) — expected, not an error.
        });

        // This tab may be joining as a follower behind a leader that's been
        // open for a while and already did its own initial sync — nothing
        // will naturally push fresh call/online-user state to it otherwise
        // (see request_state on the realtime side). Harmless no-op if this
        // tab ends up being the leader instead: it gets the same data for
        // free from its own connect() above.
        // this.requestStateSync();
    }

    requestStateSync(): void {
        const payload = { event: 'request_state' };
        if (this.activeWs?.readyState === TRANSPORT_OPEN) {
            this.activeWs.send(JSON.stringify(payload));
            return;
        }
        this.channel?.postMessage({ type: 'ws-send', payload } satisfies RelayMessage);
    }

    notifyLogout(): void {
        const payload = { event: 'user_logout' };
        if (this.activeWs?.readyState === TRANSPORT_OPEN) {
            this.activeWs.send(JSON.stringify(payload));
            return;
        }
        // Not the leader (or no socket yet) — ask whichever tab is leader to send it.
        this.channel?.postMessage({ type: 'ws-send', payload } satisfies RelayMessage);
    }
}

export const initWs = new InitWs();
