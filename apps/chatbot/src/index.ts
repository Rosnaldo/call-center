import { createServer } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { ChatSession } from './session';

// Wire protocol (JSON frames):
//   client -> server  { event: 'user_message', message: string }
//   server -> client  { event: 'bot_message', message: string }
//                     { isError: true, message: string }
export type ClientMessage = { event: 'user_message'; message: string };
export type ServerMessage = { event: 'bot_message'; message: string } | { isError: true; message: string };

const PORT = Number(process.env.CHATBOT_PORT ?? 5004);
const MAX_MESSAGE_LENGTH = 1_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

const send = (ws: WebSocket, msg: ServerMessage): void => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

const parseClientMessage = (raw: WebSocket.RawData): ClientMessage | null => {
    try {
        const msg = JSON.parse(raw.toString());
        if (msg?.event !== 'user_message' || typeof msg.message !== 'string') return null;
        return msg;
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
    const reply = (replies: string[]) => replies.forEach((message) => send(ws, { event: 'bot_message', message }));

    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));

    ws.on('message', (raw) => {
        const msg = parseClientMessage(raw);
        if (!msg) {
            send(ws, { isError: true, message: 'Invalid message' });
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
