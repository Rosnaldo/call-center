import properties from '../../../web/src/properties';

const DAILY_API_KEY = properties.dailyApiKey;

export async function ensureRoom(roomName: string): Promise<void> {
    const check = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (check.ok) return;

    const res = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({ name: roomName }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create room: ${res.status} ${text}`);
    }
}

export async function deleteRoom(roomName: string): Promise<void> {
    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
}
