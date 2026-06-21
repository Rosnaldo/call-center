import { ISocketServer, SOCKET_OPEN } from '#websocket/socket';
import { AuthenticatedWebSocket } from '#websocket/types';
import { sendToUser } from '#websocket/broadcast';
import { IUser } from '@repo/shared-types';
import { DailyMeetingPayload, DailyParticipantPayload, DailyWaitingParticipantPayload } from './daily_types';

function parseRoomName(room: string): { customerSlug: string; attendantSlug: string } | null {
    const parts = room.split('--');
    if (parts.length !== 2) return null;
    return { customerSlug: parts[0], attendantSlug: parts[1] };
}

function findUserBySlug(wss: ISocketServer, slug: string): IUser | undefined {
    for (const client of wss.clients) {
        const authClient = client as unknown as AuthenticatedWebSocket;
        if (authClient.user?.slug === slug && client.readyState === SOCKET_OPEN) {
            return authClient.user;
        }
    }
}

export function onMeetingStarted(payload: DailyMeetingPayload): void {
    console.log(`[Daily] meeting.started room=${payload.room}`);
}

export function onMeetingEnded(payload: DailyMeetingPayload): void {
    console.log(`[Daily] meeting.ended room=${payload.room}`);
}

export function onParticipantJoined(wss: ISocketServer, payload: DailyParticipantPayload): void {
    console.log(`[Daily] participant.joined room=${payload.room} user=${payload.user_name}`);

    const parsed = parseRoomName(payload.room);
    if (!parsed) return;

    const customer = findUserBySlug(wss, parsed.customerSlug);
    const attendant = findUserBySlug(wss, parsed.attendantSlug);
    if (!customer || !attendant) return;

    sendToUser(wss, attendant._id, {
        event: 'incoming_call',
        data: { incomingCall: { customerId: customer._id, attendantId: attendant._id } },
    });
}

export function onParticipantLeft(payload: DailyParticipantPayload): void {
    console.log(`[Daily] participant.left room=${payload.room} user=${payload.user_name}`);
}

export function onWaitingParticipantJoined(payload: DailyWaitingParticipantPayload): void {
    console.log(`[Daily] waiting-participant.joined room=${payload.room} user=${payload.user_name}`);
}

export function onWaitingParticipantLeft(payload: DailyWaitingParticipantPayload): void {
    console.log(`[Daily] waiting-participant.left room=${payload.room} user=${payload.user_name}`);
}
