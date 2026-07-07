import logger from '#logger';
import { sendToUser, broadcastMessage } from '#websocket/broadcast';
import { SendIncomingCallPayload, CancelIncomingCallPayload, AcceptCallPayload, CallCompletedPayload, UserTokenChargedPayload, ChatMessageSentPayload } from './iam_types';
import { ejectBothParticipantsFromRoom } from './daily_manager';
import { updateIamTokens } from 'src/services/users';

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

export function onCallAccepted(payload: AcceptCallPayload): void {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId }, 'iam call_accepted');

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

export async function onCallCompleted(payload: CallCompletedPayload): Promise<void> {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId }, 'iam call_completed');

    sendToUser(payload.customerId, {
        event: 'call_completed',
        data: {},
    });

    sendToUser(payload.attendantId, {
        event: 'call_completed',
        data: {},
    });

    broadcastMessage({
        event: 'online_users_broadcast',
        data: {},
    });

    try {
        await ejectBothParticipantsFromRoom(payload.roomName);
    } catch (error) {
        logger.error(error, 'iam call_completed: falha ao remover participantes do daily');
    }
}

export async function onUserTokenCharged(payload: UserTokenChargedPayload): Promise<void> {
    logger.info({ userId: payload.user._id, tokens: payload.user.tokens }, 'iam user_token_charged');

    sendToUser(payload.user._id, {
        event: 'user_tokens_updated',
        data: { id: payload.user._id, tokens: payload.user.tokens },
    });

    try {
        // the client above gets patched directly, but the user's cached
        // presence snapshot in Redis (used to answer full-list refetches
        // triggered by unrelated online_users_broadcast events) still holds
        // the pre-charge token count unless we refresh it here too — leaving
        // it stale would clobber the correct value back onto every other
        // viewer (and this same client) on the next refetch
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
