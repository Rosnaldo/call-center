import { spawn, ChildProcess } from 'child_process';
import properties from '#properties';
import logger from '#logger';
import { iamApi } from '#apis/iam';

const DAILY_API_URL = 'https://api.daily.co/v1';
const WEBHOOK_PATH_LOCAL = '/webhooks/daily';
const WEBHOOK_PATH_REMOTE = '/realtime/webhooks/daily';

let ngrokProcess: ChildProcess | null = null;

function dailyHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${properties.dailyApiKey}`,
    };
}

async function startNgrok(): Promise<string> {
    const port = String(properties.port);
    logger.info({ port }, 'ngrok abrindo tunnel');

    const proc = spawn('ngrok', ['http', port], {
        stdio: 'ignore',
        detached: true,
    });
    ngrokProcess = proc;
    let spawnError: Error | null = null;
    proc.on('error', (err) => { spawnError = new Error(`ngrok: ${err.message}`); });

    for (let i = 0; i < 30; i++) {
        if (spawnError) throw spawnError;
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
        logger.info({ uuid: wh.uuid }, 'daily webhook removido');
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
        logger.info({ attempt: i + 1, maxAttempts }, 'daily aguardando endpoint');
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
}

async function createWebhook(url: string): Promise<void> {
    const reachable = await waitForEndpoint(url);
    if (!reachable) {
        logger.error({ url }, 'daily endpoint não ficou acessível, abortando registro');
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
        logger.error({ status: res.status, body: await res.text() }, 'daily erro ao criar webhook');
        return;
    }
    const webhook = await res.json();
    logger.info({ uuid: webhook.uuid, url }, 'daily webhook criado');
}

async function deleteTrackedRooms(): Promise<void> {
    try {
        const { data } = await iamApi.delete<{ rooms: string[] }>('/calls/rooms');
        for (const room of data.rooms) {
            await fetch(`${DAILY_API_URL}/rooms/${room}`, {
                method: 'DELETE',
                headers: dailyHeaders(),
            })
            logger.info({ room }, 'daily room removida');
        }
    } catch {}
}

export async function registerDailyWebhooks(): Promise<void> {
    if (!properties.dailyApiKey || !properties.webhookUrl) {
        logger.warn('daily DAILY_API_KEY ou WEBHOOK_URL não definida, pulando registro de webhooks');
        return;
    }

    let baseUrl: string;
    let webhookPath: string;

    if (properties.nodeEnv === 'dev' || properties.nodeEnv === 'local') {
        try {
            const ngrokUrl = await startNgrok();
            logger.info({ url: ngrokUrl }, 'ngrok tunnel ativo');
            baseUrl = ngrokUrl;
        } catch (err) {
            logger.warn({ err: String(err) }, 'daily ngrok não disponível, pulando registro de webhooks');
            return;
        }
        // ngrok tunnels directly to this container's port, bypassing the nginx /realtime prefix
        webhookPath = WEBHOOK_PATH_LOCAL;
    } else {
        baseUrl = properties.webhookUrl.replace(/\/$/, '');
        webhookPath = WEBHOOK_PATH_REMOTE;
    }

    const webhookUrl = `${baseUrl}${webhookPath}`;

    await deleteAllWebhooks();
    await createWebhook(webhookUrl);

    logger.info('daily webhooks registrados');
}

export async function cleanupDailyWebhooks(): Promise<void> {
    await deleteAllWebhooks()
    await deleteTrackedRooms()
    if (ngrokProcess) {
        ngrokProcess.kill();
        ngrokProcess = null;
    }
}
