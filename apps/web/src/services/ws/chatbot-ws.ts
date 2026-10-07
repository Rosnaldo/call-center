import i18n from 'i18next';
import { ITransport, TransportFactory, TRANSPORT_OPEN, createWsTransport } from './transport';
import type { ChatbotStoreInstance } from '../../states/stores';
import type { AppSearchResult } from '../../states/local/chatbot/state';
import properties from '../../properties';
import authSession from '../../auth/session';

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

// Texts come as i18n keys under `chatbot.` (see apps/chatbot/src/prompts.ts).
interface BotText {
    key: string;
    params?: Record<string, unknown>;
}

// The collected params, sent as the `summary` param of the confirm/done messages.
interface BotSummary {
    os: string | null;
    version: string | null;
    privateDnsHost: string | null;
    allowedApps: string[] | null;
    installOs: string | null;
}

// Mirrors the protocol in apps/chatbot/src/index.ts.
type ChatbotServerMessage =
    | ({ event: 'bot_message'; sendEnabled: boolean } & BotText)
    | { event: 'open_allowed_apps' }
    | { event: 'ask_choice'; choices: { key: string; value: string }[] }
    | { event: 'offer_restart' }
    | { event: 'installer_ready'; url: string }
    | { event: 'apps_search_results'; term: string; apps: AppSearchResult[]; failed: boolean }
    | { isError: true; message: string };

// Same rules as the chatbot's normalizeTerm (apps/chatbot/src/app-search.ts):
// it ignores other terms, which would leave the search loading forever.
export const normalizeSearchTerm = (term: string): string | null => {
    const value = term.trim().replace(/\s+/g, ' ').toLowerCase();
    return value.length >= 2 && value.length <= 50 ? value : null;
};

const t = (key: string, params?: Record<string, unknown>): string => i18n.t(`chatbot.${key}`, params);

// Same lines as the chatbot CLI's formatSummary (apps/chatbot/src/cli.ts).
export const formatSummary = ({ os, version, privateDnsHost, allowedApps, installOs }: BotSummary): string =>
    [
        [t('summary.os'), os],
        [t('summary.version'), version],
        [t('summary.privateDns'), privateDnsHost ?? t('summary.no')],
        [t('summary.allowedApps'), allowedApps?.length ? allowedApps.join(', ') : t('summary.none')],
        [t('summary.installOs'), installOs],
    ]
        .map(([label, value]) => `  ${label}: ${value}`)
        .join('\n');

export const translateBotText = ({ key, params }: BotText): string => {
    const summary = params?.summary as BotSummary | undefined;
    return t(key, summary ? { ...params, summary: formatSummary(summary) } : params);
};

// Starts the browser download of the installer (a presigned S3 URL served as
// an attachment, so the page stays put).
const downloadFile = (url: string): void => {
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
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
        private readonly download: (url: string) => void = downloadFile,
        private readonly getToken: () => Promise<string | undefined> = () => authSession.getToken(),
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

    // `shown` is what the chat shows as the user's message, e.g. a choice's
    // label while its value is sent. Returns false when the message couldn't
    // be sent (socket not open).
    sendMessage(text: string, shown: string = text): boolean {
        if (this.ws?.readyState !== TRANSPORT_OPEN) return false;
        const { addMessage, fulfillChoiceRequest, setBotTyping } = this.store.getState();
        addMessage({ autor: 'user', message: shown });
        // Typing answers a choice as well; the bot asks again if it isn't one.
        fulfillChoiceRequest();
        setBotTyping(true);
        this.ws.send(JSON.stringify({ event: 'user_message', message: text }));
        return true;
    }

    // Answers the bot's `open_allowed_apps` with the ids picked in the checklist.
    // Returns false when the list couldn't be sent (socket not open).
    sendAllowedApps(apps: string[]): boolean {
        if (this.ws?.readyState !== TRANSPORT_OPEN) return false;
        // No echo of the picked list: the bot's confirmation already shows it.
        const { fulfillAllowedAppsRequest, setBotTyping } = this.store.getState();
        fulfillAllowedAppsRequest();
        setBotTyping(true);
        this.ws.send(JSON.stringify({ event: 'allowed_apps', apps }));
        return true;
    }

    // Answers the bot's `offer_restart`: the server starts a new conversation
    // and greets again, so the finished one is cleared from the board.
    // Returns false when the request couldn't be sent (socket not open).
    restart(): boolean {
        if (this.ws?.readyState !== TRANSPORT_OPEN) return false;
        const { resetChatbot, setBotTyping } = this.store.getState();
        resetChatbot();
        setBotTyping(true);
        this.ws.send(JSON.stringify({ event: 'restart' }));
        return true;
    }

    // Answers the "generate installer" button: the bot replies with a message
    // and the download URL, or asks to log in when there's no valid token
    // (the socket is anonymous, so the token goes with the request).
    // Resolves to false when the request couldn't be sent.
    async generateInstaller(): Promise<boolean> {
        if (this.ws?.readyState !== TRANSPORT_OPEN) return false;
        this.store.getState().setBotTyping(true);
        const token = await this.getToken().catch(() => undefined);
        if (this.ws?.readyState !== TRANSPORT_OPEN) {
            this.store.getState().setBotTyping(false);
            return false;
        }
        this.ws.send(JSON.stringify(token ? { event: 'generate_installer', token } : { event: 'generate_installer' }));
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
                const { addMessage, setSendEnabled } = this.store.getState();
                addMessage({ autor: 'bot', message: translateBotText(msg) });
                setSendEnabled(msg.sendEnabled);
            } else if (msg.event === 'open_allowed_apps') {
                // Shows the button on the bot's question; the user opens the modal.
                this.store.getState().requestAllowedApps();
            } else if (msg.event === 'ask_choice') {
                this.store.getState().requestChoice(msg.choices.map(({ key, value }) => ({ label: t(key), value })));
            } else if (msg.event === 'installer_ready') {
                this.download(msg.url);
            } else if (msg.event === 'offer_restart') {
                this.store.getState().offerRestart();
            }
        };

        ws.onclose = () => {
            this.store.getState().setBotTyping(false);
            if (!this.running || this.ws !== ws) return;
            this.reconnectRef = setTimeout(() => this.open(), this.nextReconnectDelay());
        };
    }
}
