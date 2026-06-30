import { buildLogger } from '#logger';
import { findUserBySlug } from 'src/services/users';
import { createCall, deleteCall, getCallByRoom, updateCall, trackRoom } from 'src/services/calls';
import { parseRoomName } from 'src/helpers/parse_room_name';
import { DailyMeetingPayload, DailyParticipantPayload } from './daily_types';

export async function onMeetingStarted(traceId: string, payload: DailyMeetingPayload): Promise<void> {
    const logger = buildLogger(traceId);
    logger.info({ room: payload.room }, 'daily meeting.started');

    try {
        trackRoom(traceId, payload.room)
        const parsed = parseRoomName(payload.room);
        if (!parsed) return;

        const [customer, attendant] = await Promise.all([
            findUserBySlug(traceId, parsed.customerSlug),
            findUserBySlug(traceId, parsed.attendantSlug),
        ]);
        if (!customer || !attendant) return;

        let call = await getCallByRoom(traceId, payload.room);
        if (!call) {
            await createCall(traceId, {
                id: `${customer._id}--${attendant._id}`,
                customerId: customer._id,
                customerName: `${customer.firstName} ${customer.lastName}`,
                attendantId: attendant._id,
                attendantName: `${attendant.firstName} ${attendant.lastName}`,
                roomName: payload.room,
                meetingId: payload.meeting_id,
                customerInCall: false,
                attendantInCall: false,
            });
        } else {
            call = await updateCall(traceId, call.customerId, call.attendantId, {
                roomName: payload.room,
                meetingId: payload.meeting_id,
            });
        }

    } catch (error) {
        logger.error(error, 'daily onMeetingStarted');
    }
}

export function onMeetingEnded(traceId: string, payload: DailyMeetingPayload): void {
    buildLogger(traceId).info({ room: payload.room }, 'daily meeting.ended');
    // create call history + tokens charged
}

export async function onParticipantJoined(traceId: string, payload: DailyParticipantPayload): Promise<void> {
    const logger = buildLogger(traceId);
    logger.info({ room: payload.room, user: payload.user_name }, 'daily participant.joined');

    try {
        const parsed = parseRoomName(payload.room);
        if (!parsed) return;

        const [customer, attendant] = await Promise.all([
            findUserBySlug(traceId, parsed.customerSlug),
            findUserBySlug(traceId, parsed.attendantSlug),
        ]);
        if (!customer || !attendant) return;

        let call = await getCallByRoom(traceId, payload.room);
        if (!call) {
            call = await createCall(traceId, {
                id: `${customer._id}--${attendant._id}`,
                customerId: customer._id,
                customerName: `${customer.firstName} ${customer.lastName}`,
                attendantId: attendant._id,
                attendantName: `${attendant.firstName} ${attendant.lastName}`,
                roomName: payload.room,
                meetingId: '',
                customerInCall: false,
                attendantInCall: false,
            });
        }

        const isCustomer = `${customer.firstName} ${customer.lastName}` === payload.user_name;
        call = await updateCall(traceId, call.customerId, call.attendantId, isCustomer ? { customerInCall: true } : { attendantInCall: true });

    } catch (error) {
        logger.error(error, 'daily onParticipantJoined');
    }
}

export async function onParticipantLeft(traceId: string, payload: DailyParticipantPayload): Promise<void> {
    const logger = buildLogger(traceId);
    logger.info({ room: payload.room, user: payload.user_name }, 'daily participant.left');

    try {
        const parsed = parseRoomName(payload.room);
        if (!parsed) return;

        const [customer, attendant] = await Promise.all([
            findUserBySlug(traceId, parsed.customerSlug),
            findUserBySlug(traceId, parsed.attendantSlug),
        ]);
        if (!customer || !attendant) return;

        let call = await getCallByRoom(traceId, payload.room);
        if (call) {
            const isCustomer = `${customer.firstName} ${customer.lastName}` === payload.user_name;
            call = await updateCall(traceId, call.customerId, call.attendantId, isCustomer ? { customerInCall: false } : { attendantInCall: false });

            if (call && !call.customerInCall && !call.attendantInCall) {
                await deleteCall(traceId, call.customerId, call.attendantId);
            }
        }

    } catch (error) {
        logger.error(error, 'daily onParticipantLeft');
    }
}
