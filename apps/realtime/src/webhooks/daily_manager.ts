import { spawn, ChildProcess } from 'child_process';
import properties from '#properties';
import { iamApi } from '#apis/iam';

const DAILY_API_URL = 'https://api.daily.co/v1';
const WEBHOOK_PATH = '/realtime/webhooks/daily';

let ngrokProcess: ChildProcess | null = null;

function dailyHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${properties.dailyApiKey}`,
    };
}

async function startNgrok(): Promise<string> {
    const port = String(properties.port);
    console.log(`[ngrok] abrindo tunnel para localhost:${port}...`);

    const proc = spawn('ngrok', ['http', port], {
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
            const tunnel = (data.tunnels as { public_url: string }[])?.find((t) => t.public_url?.startsWith('https://'));
            if (tunnel) return tunnel.public_url;
        } catch {}
    }
    throw new Error('ngrok timeout');
}

async function deleteAllWebhooks(): Promise<void> {
    const res = await fetch(`${DAILY_API_URL}/webhooks`, {
        headers: dailyHeaders(),
    });
    if (!res.ok) return;
    const webhooks = await res.json();
    for (const wh of (webhooks.data ?? webhooks)) {
        await fetch(`${DAILY_API_URL}/webhooks/${wh.uuid}`, {
            method: 'DELETE',
            headers: dailyHeaders(),
        });
        console.log(`[Daily] webhook removido: ${wh.uuid}`);
    }
}

async function waitForEndpoint(url: string): Promise<boolean> {
    const maxAttempts = 30;
    const intervalMs = 2000;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch {}
        console.log(`[Daily] aguardando endpoint ficar acessível... (${i + 1}/${maxAttempts})`);
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
}

async function createWebhook(url: string): Promise<void> {
    const reachable = await waitForEndpoint(url);
    if (!reachable) {
        console.error(`[Daily] endpoint ${url} não ficou acessível após tentativas, abortando registro`);
        return;
    }

    const res = await fetch(`${DAILY_API_URL}/webhooks`, {
        method: 'POST',
        headers: dailyHeaders(),
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

async function deleteTrackedRooms(): Promise<void> {
    try {
        const { data } = await iamApi.delete<{ rooms: string[] }>('/calls/rooms');
        for (const room of data.rooms) {
            await fetch(`${DAILY_API_URL}/rooms/${room}`, {
                method: 'DELETE',
                headers: dailyHeaders(),
            }).catch(() => {});
            console.log(`[Daily] room removida: ${room}`);
        }
    } catch {}
}

export async function registerDailyWebhooks(): Promise<void> {
    if (!properties.dailyApiKey || !properties.webhookUrl) {
        console.warn('[Daily] DAILY_API_KEY ou WEBHOOK_URL não definida, pulando registro de webhooks');
        return;
    }

    let baseUrl: string;

    if (properties.nodeEnv === 'dev' || properties.nodeEnv === 'local') {
        try {
            const ngrokUrl = await startNgrok();
            console.log(`[ngrok] tunnel: ${ngrokUrl}`);
            baseUrl = ngrokUrl;
        } catch (err) {
            console.warn(`[Daily] ngrok não disponível, pulando registro de webhooks: ${err}`);
            return;
        }
    } else {
        baseUrl = properties.webhookUrl.replace(/\/$/, '');
    }

    const webhookUrl = `${baseUrl}${WEBHOOK_PATH}`;

    await deleteAllWebhooks();
    await createWebhook(webhookUrl);

    console.log('[Daily] webhooks registrados');
}

export async function cleanupDailyWebhooks(): Promise<void> {
    await deleteAllWebhooks().catch(() => {});
    await deleteTrackedRooms().catch(() => {});
    if (ngrokProcess) {
        ngrokProcess.kill();
        ngrokProcess = null;
    }
}
