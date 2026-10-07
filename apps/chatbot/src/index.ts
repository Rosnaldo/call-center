import { createServer } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { AppSearchQueue, normalizeTerm, searchGooglePlay, type AppSearchResult } from './app-search';
import { ChatSession, type BotReply } from './session';

// Wire protocol (JSON frames):
//   client -> server  { event: 'user_message', message: string }
//                     { event: 'allowed_apps', apps: string[] }   answers open_allowed_apps
//                     { event: 'search_apps', term: string }      Google Play search, while the checklist is open
//   server -> client  { event: 'bot_message', message: string }
//                     { event: 'open_allowed_apps' }             client opens its app checklist
//                     { event: 'apps_search_results', term, apps: { id, name, iconUrl }[], failed }
//                     { isError: true, message: string }
export type ClientMessage =
    | { event: 'user_message'; message: string }
    | { event: 'allowed_apps'; apps: unknown[] }
    | { event: 'search_apps'; term: string };
export type ServerMessage =
    | BotReply
    | { event: 'apps_search_results'; term: string; apps: AppSearchResult[]; failed: boolean }
    | { isError: true; message: string };

const PORT = Number(process.env.CHATBOT_PORT ?? 5004);
const MAX_MESSAGE_LENGTH = 1_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

const send = (ws: WebSocket, msg: ServerMessage): void => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

const parseClientMessage = (raw: WebSocket.RawData): ClientMessage | null => {
    try {
        const msg = JSON.parse(raw.toString());
        if (msg?.event === 'user_message' && typeof msg.message === 'string') return msg;
        // Ids are validated by the session.
        if (msg?.event === 'allowed_apps' && Array.isArray(msg.apps)) return msg;
        if (msg?.event === 'search_apps' && typeof msg.term === 'string') return msg;
        return null;
    } catch {
        return null;
    }
};

const server = createServer((_req, res) => {
    // Plain HTTP only answers health checks; everything else goes over the socket.
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
});
const wss = new WebSocketServer({ server });
const alive = new WeakMap<WebSocket, boolean>();

wss.on('connection', (ws) => {
    // Each socket gets its own conversation; closing the socket ends it.
    const session = new ChatSession();
    const reply = (replies: BotReply[]) => replies.forEach((msg) => send(ws, msg));
    // Results echo the normalized term, so the client can drop stale ones.
    const appSearch = new AppSearchQueue(searchGooglePlay, (outcome) =>
        send(ws, { event: 'apps_search_results', ...outcome }),
    );

    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));

    ws.on('message', (raw) => {
        const msg = parseClientMessage(raw);
        if (!msg) {
            send(ws, { isError: true, message: 'Invalid message' });
            return;
        }
        if (msg.event === 'allowed_apps') {
            reply(session.selectAllowedApps(msg.apps));
            return;
        }
        if (msg.event === 'search_apps') {
            // Only while the checklist is open, so the socket isn't a free Play search proxy.
            const term = normalizeTerm(msg.term);
            if (term && session.isPickingAllowedApps()) appSearch.push(term);
            return;
        }
        if (msg.message.length > MAX_MESSAGE_LENGTH) {
            send(ws, { isError: true, message: 'Message too long' });
            return;
        }
        reply(session.handle(msg.message));
    });

    ws.on('close', () => session.stop());

    reply(session.start());
});

// Drops sockets whose peer vanished without a close frame (network loss,
// sleeping laptop), so their sessions don't pile up.
const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
        if (!alive.get(ws)) {
            ws.terminate();
            continue;
        }
        alive.set(ws, false);
        ws.ping();
    }
}, HEARTBEAT_INTERVAL_MS);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => console.log(`chatbot ws listening on :${PORT}`));
