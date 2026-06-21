import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { findUserBySlug } from 'src/services/users';
import { createCall } from 'src/services/calls';
import { parseRoomName } from 'src/helpers/parse_room_name';
import { DailyMeetingPayload, DailyParticipantPayload, DailyWaitingParticipantPayload } from './daily_types';

export async function onMeetingStarted(payload: DailyMeetingPayload): Promise<void> {
    console.log(`[Daily] meeting.started room=${payload.room}`);

    const parsed = parseRoomName(payload.room);
    if (!parsed) return;

    const [customer, attendant] = await Promise.all([
        findUserBySlug(parsed.customerSlug),
        findUserBySlug(parsed.attendantSlug),
    ]);
    if (!customer || !attendant) return;

    await createCall({
        id: payload.id,
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        attendantId: attendant._id,
        attendantName: `${attendant.firstName} ${attendant.lastName}`,
        roomName: payload.room,
        meetingId: payload.id,
        status: 'active',
        wasAnswered: false,
    });
}

export function onMeetingEnded(payload: DailyMeetingPayload): void {
    console.log(`[Daily] meeting.ended room=${payload.room}`);
}

export async function onParticipantJoined(wss: ISocketServer, payload: DailyParticipantPayload): Promise<void> {
    console.log(`[Daily] participant.joined room=${payload.room} user=${payload.user_name}`);

    const parsed = parseRoomName(payload.room);
    if (!parsed) return;

    const [customer, attendant] = await Promise.all([
        findUserBySlug(parsed.customerSlug),
        findUserBySlug(parsed.attendantSlug),
    ]);
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
