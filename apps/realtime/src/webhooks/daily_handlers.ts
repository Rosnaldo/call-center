import { ISocketServer } from '#websocket/socket';
import { sendToUser } from '#websocket/broadcast';
import { findUserBySlug } from 'src/services/users';
import { createCall, deleteCall, getCallByRoom, updateCall } from 'src/services/calls';
import { parseRoomName } from 'src/helpers/parse_room_name';
import { DailyMeetingPayload, DailyParticipantPayload } from './daily_types';

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
        customerInCall: false,
        attendantInCall: false,
        wasAccepted: false,
    });
}

export function onMeetingEnded(payload: DailyMeetingPayload): void {
    console.log(`[Daily] meeting.ended room=${payload.room}`);
    // create call history + tokens charged
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

    let call = await getCallByRoom(payload.room);
    if (!call) {
        call = await createCall({
            id: payload.id,
            customerId: customer._id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            attendantId: attendant._id,
            attendantName: `${attendant.firstName} ${attendant.lastName}`,
            roomName: payload.room,
            meetingId: payload.id,
            customerInCall: false,
            attendantInCall: false,
            wasAccepted: false,
        });
    }

    if (call) {
        const isCustomer = `${customer.firstName} ${customer.lastName}` === payload.user_name;
        call = await updateCall(call.id, isCustomer ? { customerInCall: true } : { attendantInCall: true });
    }

    sendToUser(wss, customer._id, {
        event: 'participant_joined',
        data: { call },
    });

    sendToUser(wss, attendant._id, {
        event: 'participant_joined',
        data: { call },
    });
}

export async function onParticipantLeft(wss: ISocketServer, payload: DailyParticipantPayload): Promise<void> {
    console.log(`[Daily] participant.left room=${payload.room} user=${payload.user_name}`);

    const parsed = parseRoomName(payload.room);
    if (!parsed) return;

    const [customer, attendant] = await Promise.all([
        findUserBySlug(parsed.customerSlug),
        findUserBySlug(parsed.attendantSlug),
    ]);
    if (!customer || !attendant) return;

    let call = await getCallByRoom(payload.room);
    if (call) {
        const isCustomer = `${customer.firstName} ${customer.lastName}` === payload.user_name;
        call = await updateCall(call.id, isCustomer ? { customerInCall: false } : { attendantInCall: false });

        if (call && !call.customerInCall && !call.attendantInCall) {
            await deleteCall(call.id);
        }
    }

    sendToUser(wss, customer._id, {
        event: 'participant_left',
        data: { call },
    });

    sendToUser(wss, attendant._id, {
        event: 'participant_left',
        data: { call },
    });
}
