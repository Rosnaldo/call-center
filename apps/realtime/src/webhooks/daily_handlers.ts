import { CallState, computeTokensToBeCharged } from '@repo/shared-types';
import { buildLogger } from '#logger';
import { sendToUser } from '#websocket/broadcast';
import { findUserBySlug } from 'src/services/users';
import { createCall, getCallByRoom, updateCall, trackRoom } from 'src/services/calls';
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

        const call = await getCallByRoom(traceId, payload.room);
        if (!call) {
            await createCall(traceId, {
                id: `${customer._id}--${attendant._id}`,
                customerId: customer._id,
                customerName: `${customer.firstName} ${customer.lastName}`,
                attendantId: attendant._id,
                attendantName: `${attendant.firstName} ${attendant.lastName}`,
                roomName: payload.room,
                meetingId: payload.meeting_id,
                activeUserIds: [],
                accumulatedMs: 0,
                overlapStartedAt: null,
                startedAt: new Date(),
                endedAt: null,
                isPlaying: false,
                tokensToBeCharged: 0,
            });
        } else {
            await updateCall(traceId, call.customerId, call.attendantId, {
                meetingId: payload.meeting_id,
                startedAt: new Date(),
            });
        }

    } catch (error) {
        logger.error(error, 'daily onMeetingStarted');
    }
}

export async function onMeetingEnded(traceId: string, payload: DailyMeetingPayload): Promise<void> {
    const logger = buildLogger(traceId);
    logger.info({ room: payload.room }, 'daily meeting.ended');
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
                activeUserIds: [],
                accumulatedMs: 0,
                overlapStartedAt: null,
                startedAt: null,
                endedAt: null,
                isPlaying: false,
                tokensToBeCharged: 0,
            });
        }

        const isCustomer = `${customer.firstName} ${customer.lastName}` === payload.user_name;
        const userId = isCustomer ? customer._id : attendant._id;

        const activeUsers = new Set(call.activeUserIds);
        activeUsers.add(userId);

        const updates: Partial<CallState> = {
            activeUserIds: Array.from(activeUsers),
            tokensToBeCharged: computeTokensToBeCharged(call.accumulatedMs),
        };

        if (activeUsers.size === 2 && !call.overlapStartedAt) {
            updates.overlapStartedAt = Date.now();
            updates.isPlaying = true;
        }

        call = await updateCall(traceId, call.customerId, call.attendantId, updates);

        sendToUser(call.customerId, { event: 'participant_joined', data: { call } });
        sendToUser(call.attendantId, { event: 'participant_joined', data: { call } });

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
            const userId = isCustomer ? customer._id : attendant._id;

            const activeUsers = new Set(call.activeUserIds);

            const updates: Partial<CallState> = {};

            if (activeUsers.size === 2 && call.overlapStartedAt) {
                updates.accumulatedMs = call.accumulatedMs + (Date.now() - call.overlapStartedAt);
                updates.overlapStartedAt = null;
                updates.isPlaying = false;
            }

            activeUsers.delete(userId);
            updates.activeUserIds = Array.from(activeUsers);

            call = await updateCall(traceId, call.customerId, call.attendantId, updates);

            sendToUser(call.customerId, { event: 'participant_left', data: { call } });
            sendToUser(call.attendantId, { event: 'participant_left', data: { call } });

            // The call record is intentionally kept around (even once both users
            // have left) — the Daily.co room may still be open for a rejoin, and
            // onMeetingEnded is the sole place that finalizes billing, flips the
            // customer/attendant back to idle, and deletes the record.
        }

    } catch (error) {
        logger.error(error, 'daily onParticipantLeft');
    }
}
