import { ITransport, TransportFactory, TRANSPORT_OPEN, createWsTransport } from './transport';
import type { ChatbotStoreInstance } from '../../states/stores';
import type { AppSearchResult } from '../../states/local/chatbot/state';
import properties from '../../properties';

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

// Mirrors the protocol in apps/chatbot/src/index.ts.
type ChatbotServerMessage =
    | { event: 'bot_message'; message: string }
    | { event: 'open_allowed_apps' }
    | { event: 'apps_search_results'; term: string; apps: AppSearchResult[]; failed: boolean }
    | { isError: true; message: string };

// Same rules as the chatbot's normalizeTerm (apps/chatbot/src/app-search.ts):
// it ignores other terms, which would leave the search loading forever.
export const normalizeSearchTerm = (term: string): string | null => {
    const value = term.trim().replace(/\s+/g, ' ').toLowerCase();
    return value.length >= 2 && value.length <= 50 ? value : null;
};

// Socket to the chatbot app. Unlike InitWs this is anonymous, per-tab and
// lives only while the chatbot UI is mounted: every socket is a fresh
// conversation on the server, so there's nothing to share between tabs.
export class ChatbotWs {
    private ws: ITransport | null = null;
    private running = false;
    private reconnectAttempts = 0;
    private reconnectRef: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private readonly store: ChatbotStoreInstance,
        private readonly url: string = properties.chatbotWsUrl,
        private readonly factory: TransportFactory = createWsTransport,
    ) {}

    connect(): void {
        if (!this.url) return;
        this.running = true;
        this.open();
    }

    disconnect(): void {
        this.running = false;
        if (this.reconnectRef) clearTimeout(this.reconnectRef);
        this.reconnectRef = null;
        this.ws?.close();
        this.ws = null;
    }

    // Returns false when the message couldn't be sent (socket not open).
    sendMessage(text: string): boolean {
        if (this.ws?.readyState !== TRANSPORT_OPEN) return false;
        this.store.getState().addMessage({ autor: 'user', message: text });
        this.store.getState().setBotTyping(true);
        this.ws.send(JSON.stringify({ event: 'user_message', message: text }));
        return true;
    }

    // Answers the bot's `open_allowed_apps` with the ids picked in the checklist.
    // Returns false when the list couldn't be sent (socket not open).
    sendAllowedApps(apps: string[]): boolean {
        if (this.ws?.readyState !== TRANSPORT_OPEN) return false;
        const { addMessage, fulfillAllowedAppsRequest, setBotTyping } = this.store.getState();
        addMessage({ autor: 'user', message: apps.length ? apps.join(', ') : 'nenhum app' });
        fulfillAllowedAppsRequest();
        setBotTyping(true);
        this.ws.send(JSON.stringify({ event: 'allowed_apps', apps }));
        return true;
    }

    // Google Play search for the allowed apps checklist; results land in the store.
    searchApps(rawTerm: string): void {
        const { appSearch, startAppSearch, clearAppSearch } = this.store.getState();
        const term = normalizeSearchTerm(rawTerm);
        if (!term) {
            clearAppSearch();
            return;
        }
        if (term === appSearch.term && appSearch.status !== 'error') return;
        startAppSearch(term);
        if (this.ws?.readyState !== TRANSPORT_OPEN) {
            this.store.getState().setAppSearchResults({ term, apps: [], failed: true });
            return;
        }
        this.ws.send(JSON.stringify({ event: 'search_apps', term }));
    }

    // Same full-jitter backoff as InitWs.
    private nextReconnectDelay(): number {
        const cap = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts);
        this.reconnectAttempts += 1;
        return Math.random() * cap;
    }

    private open(): void {
        const ws = this.factory(this.url);
        this.ws = ws;

        ws.onopen = () => {
            this.reconnectAttempts = 0;
            // The server starts a new conversation per socket and greets
            // right away, so any history from a previous socket is stale.
            this.store.getState().resetChatbot();
        };

        ws.onmessage = (event) => {
            let msg: ChatbotServerMessage;
            try {
                msg = JSON.parse(event.data as string);
            } catch {
                return; // malformed frame — ignore
            }
            if ('event' in msg && msg.event === 'apps_search_results') {
                this.store.getState().setAppSearchResults(msg);
                return;
            }
            this.store.getState().setBotTyping(false);
            if ('isError' in msg) {
                console.error('[chatbot-ws]', msg.message);
                return;
            }
            if (msg.event === 'bot_message') {
                this.store.getState().addMessage({ autor: 'bot', message: msg.message });
            } else if (msg.event === 'open_allowed_apps') {
                // Shows the button on the bot's question; the user opens the modal.
                this.store.getState().requestAllowedApps();
            }
        };

        ws.onclose = () => {
            this.store.getState().setBotTyping(false);
            if (!this.running || this.ws !== ws) return;
            this.reconnectRef = setTimeout(() => this.open(), this.nextReconnectDelay());
        };
    }
}
