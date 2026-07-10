import logger from '#logger';
import { sendToUser, broadcastMessage } from '#websocket/broadcast';
import { UserTokenChargedPayload, ChatMessageSentPayload } from './iam_types';
import { updateIamTokens } from 'src/services/users';

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
