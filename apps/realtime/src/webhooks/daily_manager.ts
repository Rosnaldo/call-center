import { spawn, ChildProcess } from 'child_process';
import properties from '#properties';
import logger from '#logger';
import { createIamClient } from '#apis/iam';

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
    try {
        const res = await fetch(`${DAILY_API_URL}/webhooks`, {
            headers: dailyHeaders(),
        });
        if (!res.ok) {
            logger.error({ status: res.status, body: await res.text() }, 'daily erro ao listar webhooks');
            return;
        }
        const webhooks = await res.json();
        for (const wh of (webhooks.data ?? webhooks)) {
            const delRes = await fetch(`${DAILY_API_URL}/webhooks/${wh.uuid}`, {
                method: 'DELETE',
                headers: dailyHeaders(),
            });
            if (!delRes.ok) {
                logger.error({ uuid: wh.uuid, status: delRes.status, body: await delRes.text() }, 'daily erro ao remover webhook');
                continue;
            }
            logger.info({ uuid: wh.uuid }, 'daily webhook removido');
        }
    } catch (error) {
        logger.error(error, 'daily deleteAllWebhooks: falha ao comunicar com api do daily');
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

export async function deleteDailyRoom(room: string): Promise<void> {
    try {
        const res = await fetch(`${DAILY_API_URL}/rooms/${room}`, {
            method: 'DELETE',
            headers: dailyHeaders(),
        });
        if (!res.ok) {
            logger.error({ room, status: res.status, body: await res.text() }, 'daily erro ao remover room');
            return;
        }
        logger.info({ room }, 'daily room removida');
    } catch (error) {
        logger.error(error, 'daily deleteDailyRoom: falha ao comunicar com api do daily');
    }
}

export interface DailyMeetingParticipant {
    user_id: string | null;
    participant_id: string;
    user_name: string | null;
    join_time: number;
    duration: number;
}

const PARTICIPANTS_PAGE_SIZE = 100;

// A user who leaves and rejoins the same meeting gets a new participant_id per
// join (Daily's default: it only merges same-user_id sessions if the room is
// configured to eject on reconnect) — so this can legitimately return several
// entries for the same user_id, each its own join_time/duration interval.
//
// Throws instead of returning [] on failure: this is the sole source of truth
// for billing in onMeetingEnded, so silently returning "no participants" here
// would get recorded as a legitimate zero-charge call instead of surfacing
// that we actually failed to read Daily's records.
export async function getMeetingParticipants(meetingId: string): Promise<DailyMeetingParticipant[]> {
    const participants: DailyMeetingParticipant[] = [];
    let joinedAfter: string | undefined;

    for (;;) {
        const params = new URLSearchParams({ limit: String(PARTICIPANTS_PAGE_SIZE) });
        if (joinedAfter) params.set('joined_after', joinedAfter);

        const res = await fetch(`${DAILY_API_URL}/meetings/${meetingId}/participants?${params}`, {
            headers: dailyHeaders(),
        });

        if (!res.ok) {
            throw new Error(`daily erro ao consultar participants da meeting ${meetingId}: ${res.status} ${await res.text()}`);
        }

        const { data } = await res.json() as { data: DailyMeetingParticipant[] };
        participants.push(...data);

        if (data.length < PARTICIPANTS_PAGE_SIZE) break;
        joinedAfter = data[data.length - 1].participant_id;
    }

    return participants;
}

interface DailyRoomPresenceEntry {
    id: string;
    userId: string;
    userName: string;
}

async function getRoomPresence(room: string): Promise<DailyRoomPresenceEntry[]> {
    const res = await fetch(`${DAILY_API_URL}/rooms/${room}/presence`, {
        headers: dailyHeaders(),
    });

    if (!res.ok) {
        logger.error({ room, status: res.status, body: await res.text() }, 'daily erro ao consultar presence da room');
        return [];
    }

    const { data } = await res.json() as { data: DailyRoomPresenceEntry[] };
    return data;
}

// `presence[].id` is Daily's own session id, not our app's user_id — the
// join call always sets `userId` explicitly (see web's DailyService.join),
// so matching against that field is what tells us "is this specific app
// user actually connected to this room right now".
export async function isUserPresentInRoom(room: string, userId: string): Promise<boolean> {
    const presence = await getRoomPresence(room);
    return presence.some((p) => p.userId === userId);
}

async function deleteTrackedRooms(): Promise<void> {
    try {
        const { data } = await createIamClient().delete<{ rooms: string[] }>('/calls/rooms');
        for (const room of data.rooms) {
            await deleteDailyRoom(room);
        }
    } catch (error) {
        logger.error(error, 'daily deleteTrackedRooms: falha ao buscar/remover rooms rastreadas');
    }
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
