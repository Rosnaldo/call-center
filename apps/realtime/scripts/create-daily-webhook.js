require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'local'}`, override: true });

const { spawn } = require('child_process');

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const WEBHOOK_PATH = '/realtime/webhooks/daily';
const LOCAL_PORT = process.env.PORT || 443;
const LOCAL_SCHEME = LOCAL_PORT === 443 || LOCAL_PORT === '443' ? 'https' : 'http';
const LOCAL_URL = `${LOCAL_SCHEME}://localhost:${LOCAL_PORT}`;

if (!DAILY_API_KEY) {
    console.error('DAILY_API_KEY não definida no .env');
    process.exit(1);
}

async function deleteAllWebhooks() {
    const res = await fetch('https://api.daily.co/v1/webhooks', {
        headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (!res.ok) return;

    const webhooks = await res.json();
    const list = webhooks.data ?? webhooks;
    for (const wh of list) {
        await fetch(`https://api.daily.co/v1/webhooks/${wh.uuid}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
        });
        console.log(`Webhook removido: ${wh.uuid}`);
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
            eventTypes: [
                'meeting.started',
                'meeting.ended',
                'participant.joined',
                'participant.left',
            ],
        }),
    });

    if (!res.ok) {
        console.error('Erro ao criar webhook:', res.status, await res.text());
        process.exit(1);
    }

    const webhook = await res.json();
    console.log('Webhook criado:', webhook.uuid);
    console.log('URL:', url);
    return webhook;
}

function startNgrok() {
    return new Promise((resolve, reject) => {
        const ngrok = spawn('ngrok', ['http', LOCAL_URL, '--log', 'stdout', '--log-format', 'json'], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        ngrok.on('error', (err) => {
            reject(new Error(`Falha ao iniciar ngrok: ${err.message}`));
        });

        ngrok.stderr.on('data', (data) => {
            console.error(`[ngrok] ${data.toString().trim()}`);
        });

        let resolved = false;
        ngrok.stdout.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            for (const line of lines) {
                try {
                    const log = JSON.parse(line);
                    if (log.url && log.url.startsWith('https://') && !resolved) {
                        resolved = true;
                        resolve({ url: log.url, process: ngrok });
                    }
                } catch {}
            }
        });

        setTimeout(() => {
            if (!resolved) reject(new Error('Timeout esperando ngrok iniciar'));
        }, 15000);
    });
}

async function main() {
    console.log(`Iniciando ngrok tunnel para ${LOCAL_URL}...`);
    const { url: ngrokUrl, process: ngrokProcess } = await startNgrok();
    const webhookUrl = `${ngrokUrl}${WEBHOOK_PATH}`;
    console.log(`Tunnel: ${ngrokUrl}`);

    await deleteAllWebhooks();
    await createWebhook(webhookUrl);

    console.log('\nTunnel ativo. Ctrl+C para encerrar.');

    const cleanup = async () => {
        console.log('\nEncerrando...');
        await deleteAllWebhooks().catch(() => {});
        ngrokProcess.kill();
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
