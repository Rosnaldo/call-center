export function parseRoomName(room: string): { customerSlug: string; attendantSlug: string } | null {
    const parts = room.split('--');
    if (parts.length !== 2) return null;
    return { customerSlug: parts[0], attendantSlug: parts[1] };
}
