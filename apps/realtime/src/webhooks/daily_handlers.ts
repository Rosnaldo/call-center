import { sendToUser } from '#websocket/broadcast';
import { findUserBySlug } from 'src/services/users';
import { createCall, deleteCall, getCallByRoom, updateCall } from 'src/services/calls';
import { parseRoomName } from 'src/helpers/parse_room_name';
import { DailyMeetingPayload, DailyParticipantPayload } from './daily_types';

export async function onMeetingStarted(payload: DailyMeetingPayload): Promise<void> {
    console.log(`[Daily] meeting.started room=${payload.room}`);

    try {
        const parsed = parseRoomName(payload.room);
        if (!parsed) return;

        const [customer, attendant] = await Promise.all([
            findUserBySlug(parsed.customerSlug),
            findUserBySlug(parsed.attendantSlug),
        ]);
        if (!customer || !attendant) return;

        await createCall({
            id: `${customer._id}--${attendant._id}`,
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
    } catch (error) {
        console.error('[Daily] onMeetingStarted: ', error)
    }
}

export function onMeetingEnded(payload: DailyMeetingPayload): void {
    console.log(`[Daily] meeting.ended room=${payload.room}`);
    // create call history + tokens charged
}

export async function onParticipantJoined(payload: DailyParticipantPayload): Promise<void> {
    console.log(`[Daily] participant.joined room=${payload.room} user=${payload.user_name}`);

    try {
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
                id: `${customer._id}--${attendant._id}`,
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

        const isCustomer = `${customer.firstName} ${customer.lastName}` === payload.user_name;
        call = await updateCall(call.customerId, call.attendantId, isCustomer ? { customerInCall: true } : { attendantInCall: true });

        sendToUser(customer._id, {
            event: 'participant_joined',
            data: { call },
        });

        sendToUser(attendant._id, {
            event: 'participant_joined',
            data: { call },
        });
    } catch (error) {
        console.error('[Daily] onParticipantJoined: ', error)
    }
}

export async function onParticipantLeft(payload: DailyParticipantPayload): Promise<void> {
    console.log(`[Daily] participant.left room=${payload.room} user=${payload.user_name}`);

    try {
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
            call = await updateCall(call.customerId, call.attendantId, isCustomer ? { customerInCall: false } : { attendantInCall: false });

            if (call && !call.customerInCall && !call.attendantInCall) {
                await deleteCall(call.customerId, call.attendantId);
            }
        }

        sendToUser(customer._id, {
            event: 'participant_left',
            data: { call },
        });

        sendToUser(attendant._id, {
            event: 'participant_left',
            data: { call },
        });
    } catch (error) {
        console.error('[Daily] onParticipantLeft: ', error)
    }
}
