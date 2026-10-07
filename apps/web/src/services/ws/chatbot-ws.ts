import { ITransport, TransportFactory, TRANSPORT_OPEN, createWsTransport } from './transport';
import type { ChatbotStoreInstance } from '../../states/stores';
import properties from '../../properties';

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

// Mirrors the protocol in apps/chatbot/src/index.ts.
type ChatbotServerMessage =
    | { event: 'bot_message'; message: string }
    | { isError: true; message: string };

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
            this.store.getState().setBotTyping(false);
            if ('isError' in msg) {
                console.error('[chatbot-ws]', msg.message);
                return;
            }
            if (msg.event === 'bot_message') {
                this.store.getState().addMessage({ autor: 'bot', message: msg.message });
            }
        };

        ws.onclose = () => {
            this.store.getState().setBotTyping(false);
            if (!this.running || this.ws !== ws) return;
            this.reconnectRef = setTimeout(() => this.open(), this.nextReconnectDelay());
        };
    }
}
