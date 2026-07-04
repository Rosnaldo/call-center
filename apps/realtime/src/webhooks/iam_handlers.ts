import logger from '#logger';
import { sendToUser, broadcastMessage } from '#websocket/broadcast';
import { SendIncomingCallPayload, CancelIncomingCallPayload, AcceptCallPayload, CallCompletedPayload, UserTokenChargedPayload } from './iam_types';
import { deleteDailyRoom } from './daily_manager';

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

export function onCallCompleted(payload: CallCompletedPayload): void {
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

    deleteDailyRoom(payload.roomName).catch((error) => {
        logger.error(error, 'iam call_completed: falha ao deletar room do daily');
    });
}

export function onUserTokenCharged(payload: UserTokenChargedPayload): void {
    logger.info({ userId: payload.user._id, tokens: payload.user.tokens }, 'iam user_token_charged');

    sendToUser(payload.user._id, {
        event: 'user_tokens_updated',
        data: { id: payload.user._id, tokens: payload.user.tokens },
    });
}
