import logger from '#logger';
import { sendToUser, broadcastMessage } from '#websocket/broadcast';
import { SendIncomingCallPayload, CancelIncomingCallPayload, AcceptCallPayload, CallCompletedPayload, UserTokenChargedPayload, ChatMessageSentPayload } from './iam_types';
import { updateIamTokens, findUserBySlug } from 'src/services/users';
import { getCallByRoom, createCall } from 'src/services/calls';
import { parseRoomName } from 'src/helpers/parse_room_name';

export function onSendIncomingCall(payload: SendIncomingCallPayload): void {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId, calledBy: payload.calledBy }, 'iam incoming_call_sent');

    const incomingCall = { customerId: payload.customerId, attendantId: payload.attendantId, calledBy: payload.calledBy };

    const callerId = payload.calledBy === 'customer' ? payload.customerId : payload.attendantId;
    const receiverId = payload.calledBy === 'customer' ? payload.attendantId : payload.customerId;

    sendToUser(callerId, {
        event: 'incoming_call_sent',
        data: { incomingCall },
    });

    sendToUser(receiverId, {
        event: 'incoming_call_received',
        data: { incomingCall },
    });

    broadcastMessage({
        event: 'online_users_broadcast',
        data: {},
    });
}

export function onCancelIncomingCall(payload: CancelIncomingCallPayload): void {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId }, 'iam cancel_incoming_call');

    sendToUser(payload.customerId, {
        event: 'incoming_call_cancelled',
        data: {},
    });

    sendToUser(payload.attendantId, {
        event: 'incoming_call_cancelled',
        data: {},
    });

    broadcastMessage({
        event: 'online_users_broadcast',
        data: {},
    });
}

// The web client fetches the call straight from iam's /calls/get right after
// joining the Daily room (see web's incomingCallAccepted action) — but that
// row is otherwise only created reactively once Daily's meeting.started /
// participant.joined webhooks reach onMeetingStarted/onParticipantJoined,
// which can lag behind the client's own join and surface "Call não
// encontrada" as a user-facing error. Creating it here first, before the
// client is even told the call was accepted, closes that race.
const ensureCallExists = async (traceId: string, payload: AcceptCallPayload): Promise<void> => {
    const existing = await getCallByRoom(traceId, payload.roomName);
    if (existing) return;

    const parsed = parseRoomName(payload.roomName);
    if (!parsed) return;

    const [customer, attendant] = await Promise.all([
        findUserBySlug(traceId, parsed.customerSlug),
        findUserBySlug(traceId, parsed.attendantSlug),
    ]);
    if (!customer || !attendant) return;

    await createCall(traceId, {
        id: `${customer._id}--${attendant._id}`,
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        attendantId: attendant._id,
        attendantName: `${attendant.firstName} ${attendant.lastName}`,
        roomName: payload.roomName,
        activeUserIds: [],
        accumulatedMs: 0,
        overlapStartedAt: null,
        startedAt: null,
        endedAt: null,
        isPlaying: false,
        tokensToBeCharged: 0,
        isClosed: false,
    });
};

export async function onCallAccepted(traceId: string, payload: AcceptCallPayload): Promise<void> {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId }, 'iam call_accepted');

    try {
        await ensureCallExists(traceId, payload);
    } catch (error) {
        logger.error(error, 'onCallAccepted: falha ao garantir criação antecipada da call');
    }

    sendToUser(payload.customerId, {
        event: 'call_accepted',
        data: { incomingCall: payload.incomingCall },
    });

    sendToUser(payload.attendantId, {
        event: 'call_accepted',
        data: { incomingCall: payload.incomingCall },
    });

    broadcastMessage({
        event: 'online_users_broadcast',
        data: {},
    });
}

export function onCallCompleted(payload: CallCompletedPayload): void {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId }, 'iam call_completed');

    sendToUser(payload.customerId, {
        event: 'call_completed',
        data: { call: payload.call },
    });

    sendToUser(payload.attendantId, {
        event: 'call_completed',
        data: { call: payload.call },
    });

    broadcastMessage({
        event: 'online_users_broadcast',
        data: {},
    });
}

export async function onUserTokenCharged(payload: UserTokenChargedPayload): Promise<void> {
    logger.info({ userId: payload.user._id, tokens: payload.user.tokens }, 'iam user_token_charged');

    sendToUser(payload.user._id, {
        event: 'user_tokens_updated',
        data: { id: payload.user._id, tokens: payload.user.tokens },
    });

    try {
        await updateIamTokens(payload.user._id, payload.user.tokens ?? 0);
        broadcastMessage({ event: 'online_users_broadcast', data: {} });
    } catch (error) {
        logger.error(error, 'onUserTokenCharged: falha ao sincronizar tokens no iam');
    }
}

export function onChatMessageSent(payload: ChatMessageSentPayload): void {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId, messageId: payload.message.id }, 'iam chat_message_sent');

    sendToUser(payload.customerId, {
        event: 'chat_message_received',
        data: { message: payload.message },
    });

    sendToUser(payload.attendantId, {
        event: 'chat_message_received',
        data: { message: payload.message },
    });
}
