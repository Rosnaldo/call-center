require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'local'}`, override: true });

const { spawn } = require('child_process');

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const IAM_URI = process.env.IAM_URI;
const WEBHOOK_PATH = '/realtime/webhooks/daily';

if (!DAILY_API_KEY) { console.error('DAILY_API_KEY não definida'); process.exit(1); }
if (!WEBHOOK_URL) { console.error('WEBHOOK_URL não definida'); process.exit(1); }
if (!IAM_URI) { console.error('IAM_URI não definida'); process.exit(1); }

const target = WEBHOOK_URL.replace(/\/realtime\/webhooks\/daily$/, '').replace(/\/$/, '');

let ngrokProcess = null;

async function startNgrok() {
    const proc = spawn('ngrok', ['http', target || 'https://localhost:443'], {
        stdio: 'ignore',
        detached: true,
    });
    ngrokProcess = proc;
    proc.on('error', (err) => { throw new Error(`ngrok: ${err.message}`); });

    for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 500));
        try {
            const res = await fetch('http://localhost:4040/api/tunnels');
            const data = await res.json();
            const tunnel = data.tunnels?.find((t) => t.public_url?.startsWith('https://'));
            if (tunnel) return tunnel.public_url;
        } catch {}
    }
    throw new Error('ngrok timeout');
}

async function deleteAllWebhooks() {
    const res = await fetch('https://api.daily.co/v1/webhooks', {
        headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (!res.ok) return;
    const webhooks = await res.json();
    for (const wh of (webhooks.data ?? webhooks)) {
        await fetch(`https://api.daily.co/v1/webhooks/${wh.uuid}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
        });
        console.log(`[Daily] webhook removido: ${wh.uuid}`);
    }
}

async function createWebhook(url) {
    const res = await fetch('https://api.daily.co/v1/webhooks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
            url,
            eventTypes: ['meeting.started', 'meeting.ended', 'participant.joined', 'participant.left'],
        }),
    });
    if (!res.ok) {
        console.error('[Daily] erro ao criar webhook:', res.status, await res.text());
        return;
    }
    const webhook = await res.json();
    console.log(`[Daily] webhook criado: ${webhook.uuid} → ${url}`);
}

async function deleteTrackedRooms() {
    try {
        const res = await fetch(`${IAM_URI}/calls/rooms`, { method: 'DELETE' });
        if (!res.ok) return;
        const { rooms } = await res.json();
        for (const room of rooms) {
            await fetch(`https://api.daily.co/v1/rooms/${room}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
            }).catch(() => {});
            console.log(`[Daily] room removida: ${room}`);
        }
    } catch {}
}

async function main() {
    console.log(`[ngrok] abrindo tunnel para ${target}...`);
    const ngrokUrl = await startNgrok();
    console.log(`[ngrok] tunnel: ${ngrokUrl}`);

    await deleteAllWebhooks();
    await createWebhook(`${ngrokUrl}${WEBHOOK_PATH}`);

    console.log('\nServiço ativo. Ctrl+C para encerrar.\n');

    const cleanup = async () => {
        console.log('\n[*] Encerrando...');
        await deleteAllWebhooks().catch(() => {});
        await deleteTrackedRooms().catch(() => {});
        ngrokProcess?.kill();
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
