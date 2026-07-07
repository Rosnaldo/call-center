import { CallState, computeTokensToBeCharged, getCallElapsedMs } from '@repo/shared-types';
import { buildLogger } from '#logger';
import { sendToUser, broadcastMessage } from '#websocket/broadcast';
import { findUserBySlug } from 'src/services/users';
import { createCall, getCallByRoom, updateCall, trackRoom, deleteCall, createCallHistory } from 'src/services/calls';
import { deleteChat } from 'src/services/chat';
import { createIamClient } from 'src/apis/iam';
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

    try {
        const call = await getCallByRoom(traceId, payload.room);
        if (!call) return;

        const elapsedMs = getCallElapsedMs(call);
        const tokensToBeCharged = computeTokensToBeCharged(elapsedMs);

        const endedCall: CallState = {
            ...call,
            accumulatedMs: elapsedMs,
            overlapStartedAt: null,
            isPlaying: false,
            endedAt: new Date(),
            tokensToBeCharged,
        };

        await createCallHistory(traceId, {
            callId: endedCall.id,
            customerId: endedCall.customerId,
            customerName: endedCall.customerName,
            attendantId: endedCall.attendantId,
            attendantName: endedCall.attendantName,
            roomName: endedCall.roomName,
            meetingId: endedCall.meetingId,
            accumulatedMs: endedCall.accumulatedMs,
            startedAt: endedCall.startedAt,
            endedAt: endedCall.endedAt,
            tokensToBeCharged: endedCall.tokensToBeCharged,
        });

        if (endedCall.tokensToBeCharged > 0) {
            const { data } = await createIamClient(traceId).post('/transactions/create', {
                userId: endedCall.customerId,
                message: `Consumo de chamada de vídeo com ${endedCall.attendantName}`,
                type: 'charge',
                amount: endedCall.tokensToBeCharged,
            });
            if (data?.isError) {
                throw new Error(data.message ?? 'Failed to create transaction');
            }

            const { data: chargeData } = await createIamClient(traceId).post('/users/charge-token', {
                customerId: endedCall.customerId,
                tokens: endedCall.tokensToBeCharged,
            });
            if (chargeData?.isError) {
                throw new Error(chargeData.message ?? 'Failed to charge token');
            }
        }

        await deleteCall(traceId, endedCall.customerId, endedCall.attendantId);
        try {
            await deleteChat(traceId, endedCall.customerId, endedCall.attendantId);
        } catch (error) {
            logger.error(error, 'daily onMeetingEnded: falha ao deletar chat');
        }

        sendToUser(endedCall.customerId, { event: 'meeting_ended', data: { call: endedCall } });
        sendToUser(endedCall.attendantId, { event: 'meeting_ended', data: { call: endedCall } });

        broadcastMessage({ event: 'online_users_broadcast', data: {} });
    } catch (error) {
        logger.error(error, 'daily onMeetingEnded');
    }
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
        }

    } catch (error) {
        logger.error(error, 'daily onParticipantLeft');
    }
}
