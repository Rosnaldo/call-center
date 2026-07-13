import { CallState, IUser, computeTokensToBeCharged, getCallElapsedMs } from '@repo/shared-types';
import { buildLogger } from '#logger';
import { findUserBySlug, updateOnlineUserStatus } from 'src/services/users';
import { createCall, getCallByRoom, updateCall, addParticipant, removeParticipant, trackRoom, deleteCall, createCallHistory } from 'src/services/calls';
import { notifyMeetingEnded, publishOnlineUsersBroadcast } from 'src/services/realtime_events';
import { deleteChat } from 'src/services/chat';
import { createIamClient } from 'src/apis/iam';
import { parseRoomName } from 'src/helpers/parse_room_name';
import { getMeetingParticipants, DailyMeetingParticipant } from 'src/webhooks/daily_manager';
import { DailyMeetingPayload, DailyParticipantPayload } from './daily_types';


const resolveParticipantId = (payload: DailyParticipantPayload, customer: IUser, attendant: IUser): string => {
    if (payload.user_id === customer._id || payload.user_id === attendant._id) return payload.user_id;

    const decodedName = decodeURIComponent(payload.user_name);
    const isCustomer = `${customer.firstName} ${customer.lastName}` === decodedName;
    return isCustomer ? customer._id : attendant._id;
};

const matchesUser = (participant: DailyMeetingParticipant, user: IUser): boolean => {
    if (participant.user_id === user._id) return true;
    return !!participant.user_name && decodeURIComponent(participant.user_name) === `${user.firstName} ${user.lastName}`;
};

// A user can appear as several participant entries if they reconnect mid-meeting,
// so we sum the overlap of every customer-interval/attendant-interval pair — since
// each side's own intervals don't overlap each other, this can't double-count.
const computeOverlapMs = (participants: DailyMeetingParticipant[], customer: IUser, attendant: IUser): number => {
    const toInterval = (p: DailyMeetingParticipant) => ({ start: p.join_time * 1000, end: (p.join_time + p.duration) * 1000 });
    const customerIntervals = participants.filter((p) => matchesUser(p, customer)).map(toInterval);
    const attendantIntervals = participants.filter((p) => matchesUser(p, attendant)).map(toInterval);

    let overlapMs = 0;
    for (const c of customerIntervals) {
        for (const a of attendantIntervals) {
            overlapMs += Math.max(0, Math.min(c.end, a.end) - Math.max(c.start, a.start));
        }
    }
    return overlapMs;
};

// If the redis call state was lost mid-meeting (e.g. a redis restart) but the
// meeting really happened on Daily's side, meeting.ended would otherwise just
// no-op and silently drop the billing/history for that call. Rebuild a minimal
// CallState from Daily's own participant records so we can still charge and log it.
const reconstructCallState = async (traceId: string, logger: ReturnType<typeof buildLogger>, payload: DailyMeetingPayload): Promise<CallState | null> => {
    const parsed = parseRoomName(payload.room);
    if (!parsed) return null;

    const [customer, attendant] = await Promise.all([
        findUserBySlug(traceId, parsed.customerSlug),
        findUserBySlug(traceId, parsed.attendantSlug),
    ]);
    if (!customer || !attendant) return null;

    const participants = await getMeetingParticipants(payload.meeting_id);
    const accumulatedMs = computeOverlapMs(participants, customer, attendant);

    logger.warn({ room: payload.room, meetingId: payload.meeting_id, accumulatedMs }, 'daily onMeetingEnded: call ausente no redis, reconciliando via API do Daily');

    return {
        id: `${customer._id}--${attendant._id}`,
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        attendantId: attendant._id,
        attendantName: `${attendant.firstName} ${attendant.lastName}`,
        roomName: payload.room,
        activeUserIds: [],
        accumulatedMs,
        overlapStartedAt: null,
        startedAt: new Date(payload.start_ts * 1000),
        endedAt: null,
        tokensToBeCharged: 0,
        isClosed: false,
    };
};

export async function onMeetingStarted(traceId: string, payload: DailyMeetingPayload): Promise<void> {
    const logger = buildLogger(traceId);
    logger.info({ room: payload.room }, 'daily meeting.started');

    try {
        trackRoom(traceId, payload.room)

        // Creates the record if missing (and bumps startedAt either way) —
        // onParticipantJoined also self-heals the same way, since Daily
        // doesn't guarantee this fires before the first participant.joined.
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
                activeUserIds: [],
                accumulatedMs: 0,
                overlapStartedAt: null,
                startedAt: new Date(),
                endedAt: null,
                tokensToBeCharged: 0,
                isClosed: false,
            });
        } else {
            await updateCall(traceId, call.customerId, call.attendantId, {
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
        // Redis pode não ter o registro (ex: perdeu estado num restart) mesmo
        // que o webhook do Daily confirme que a reunião aconteceu de verdade —
        // reconstrói via API do Daily em vez de simplesmente descartar a call.
        const call = await getCallByRoom(traceId, payload.room) ?? await reconstructCallState(traceId, logger, payload);
        if (!call) return;

        const elapsedMs = getCallElapsedMs(call);
        const tokensToBeCharged = computeTokensToBeCharged(elapsedMs);

        const endedCall: CallState = {
            ...call,
            accumulatedMs: elapsedMs,
            overlapStartedAt: null,
            endedAt: new Date(),
            tokensToBeCharged,
            isClosed: true,
        };

        if (endedCall.tokensToBeCharged > 0) {
            const created = await createCallHistory(traceId, {
                callId: endedCall.id,
                customerId: endedCall.customerId,
                customerName: endedCall.customerName,
                attendantId: endedCall.attendantId,
                attendantName: endedCall.attendantName,
                roomName: endedCall.roomName,
                meetingId: payload.meeting_id,
                accumulatedMs: endedCall.accumulatedMs,
                startedAt: endedCall.startedAt,
                endedAt: endedCall.endedAt,
                tokensToBeCharged: endedCall.tokensToBeCharged,
            });

            if (!created) {
                // meetingId já tem histórico — o Daily redeliverou o webhook de um
                // meeting.ended que já processamos. Cobrar/limpar de novo duplicaria
                // a cobrança do cliente, então é um no-op seguro.
                logger.info({ meetingId: payload.meeting_id }, 'daily onMeetingEnded: meeting já processada (webhook duplicado), ignorando');
                return;
            }

            const { data: chargeData } = await createIamClient(traceId).post('/users/charge-token', {
                customerId: endedCall.customerId,
                tokens: endedCall.tokensToBeCharged,
                attendantName: endedCall.attendantName,
                durationMs: endedCall.accumulatedMs,
                endedAt: endedCall.endedAt,
            });
            if (chargeData?.isError) {
                throw new Error(chargeData.message ?? 'Failed to charge token');
            }
        }

        // The room itself is no longer deleted here — rooms are reused
        // across calls for the same pair (ensureDailyRoom creates it once
        // and treats "already exists" as a no-op on the next call).
        await deleteCall(traceId, endedCall.customerId, endedCall.attendantId);
        try {
            await deleteChat(traceId, endedCall.customerId, endedCall.attendantId);
        } catch (error) {
            logger.error(error, 'daily onMeetingEnded: falha ao deletar chat');
        }

        // The only place a call ending resets general presence back to idle
        // in redis — grace_period.ts deliberately leaves 'in-call' alone
        // while a call is active, so this is what actually closes it out.
        try {
            await Promise.all([
                updateOnlineUserStatus(traceId, endedCall.customerId, 'idle'),
                updateOnlineUserStatus(traceId, endedCall.attendantId, 'idle'),
            ]);
        } catch (error) {
            logger.error(error, 'daily onMeetingEnded: falha ao atualizar status online dos usuários');
        }

        notifyMeetingEnded(traceId, endedCall.customerId, endedCall.attendantId, endedCall);

        await publishOnlineUsersBroadcast(traceId);
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

        // Daily doesn't guarantee meeting.started lands before this for the
        // first participant, so self-heal here too rather than dropping the
        // join if onMeetingStarted hasn't created the record yet.
        let call = await getCallByRoom(traceId, payload.room);
        if (!call) {
            call = await createCall(traceId, {
                id: `${customer._id}--${attendant._id}`,
                customerId: customer._id,
                customerName: `${customer.firstName} ${customer.lastName}`,
                attendantId: attendant._id,
                attendantName: `${attendant.firstName} ${attendant.lastName}`,
                roomName: payload.room,
                activeUserIds: [],
                accumulatedMs: 0,
                overlapStartedAt: null,
                startedAt: null,
                endedAt: null,
                tokensToBeCharged: 0,
                isClosed: false,
            });
        }

        const userId = resolveParticipantId(payload, customer, attendant);

        // IAM's /calls/add-participant route publishes update_call itself
        // now (see init-call-events.ts) — no need to relay it here.
        await addParticipant(traceId, call.customerId, call.attendantId, userId);
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

        const call = await getCallByRoom(traceId, payload.room);
        if (call) {
            const userId = resolveParticipantId(payload, customer, attendant);

            // IAM's /calls/remove-participant route publishes participant_left
            // itself now (see init-call-events.ts) — no need to relay it here.
            await removeParticipant(traceId, call.customerId, call.attendantId, userId);
        }
    } catch (error) {
        logger.error(error, 'daily onParticipantLeft');
    }
}
