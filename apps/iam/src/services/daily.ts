import logger from '#logger';
import properties from '#properties';

const DAILY_API_URL = 'https://api.daily.co/v1';

function dailyHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${properties.dailyApiKey}`,
    };
}

// Idempotent: always attempts to create the room outright instead of
// checking existence first — rooms aren't deleted after a call ends anymore
// (see onMeetingEnded), but this pair's room can still be missing the very
// first time, so we can't assume it's always already there either. Skipping
// the existence check saves a full round-trip to Daily.co on every accept;
// Daily responds 400 when a room with this name already exists, which is
// exactly the case that's already fine here — every other failure still
// gets logged. Called synchronously as part of accepting a call, before the
// client is told the call was accepted, so the room is guaranteed to exist
// by the time it tries to join it.
export async function ensureDailyRoom(room: string): Promise<void> {
    try {
        const createRes = await fetch(`${DAILY_API_URL}/rooms`, {
            method: 'POST',
            headers: dailyHeaders(),
            body: JSON.stringify({ name: room }),
        });
        if (createRes.ok) {
            logger.info({ room }, 'daily room criada');
            return;
        }

        const body = await createRes.text();
        if (createRes.status === 400 && body.toLowerCase().includes('already exists')) {
            return;
        }

        logger.error({ room, status: createRes.status, body }, 'daily erro ao criar room');
    } catch (error) {
        logger.error(error, 'daily ensureDailyRoom: falha ao comunicar com api do daily');
    }
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

async function getRoomPresenceIds(room: string): Promise<string[]> {
    const presence = await getRoomPresence(room);
    return presence.map((p) => p.id);
}

// `presence[].userId` is the app's own user_id, set explicitly when joining
// (see web's DailyService.join) — this is what tells us which app users are
// actually connected to a room right now, as opposed to Daily's own session
// ids (`.id`, used for ejection instead — see getRoomPresenceIds below).
export async function getRoomPresenceUserIds(room: string): Promise<string[]> {
    const presence = await getRoomPresence(room);
    return presence.map((p) => p.userId);
}

export async function ejectBothParticipantsFromRoom(room: string): Promise<void> {
    try {
        // The IAM user id isn't necessarily the same id Daily assigns a session
        // (it only matches if the join token carried `user_id`, which isn't
        // guaranteed) — ejecting by user_ids can silently match nobody, leaving
        // the room open and meeting.ended never firing. Presence gives us
        // Daily's own participant ids, which always match.
        const ids = await getRoomPresenceIds(room);
        if (ids.length === 0) {
            logger.info({ room }, 'daily nenhum participante presente na room, nada a ejetar');
            return;
        }

        const res = await fetch(`${DAILY_API_URL}/rooms/${room}/eject`, {
            method: 'POST',
            headers: dailyHeaders(),
            body: JSON.stringify({ ids }),
        });

        if (!res.ok) {
            logger.error({ room, ids, status: res.status, body: await res.text() }, 'daily falha ao ejetar participantes');
            return;
        }

        logger.info({ room, ids }, 'daily participantes ejetados');
    } catch (error) {
        logger.error(error, 'daily ejectBothParticipantsFromRoom: falha ao comunicar com api do daily');
    }
}
