import logger from '#logger';
import { UserTokenChargedPayload, ChatMessageSentPayload } from './iam_types';
import { updateIamTokens } from 'src/services/users';
import { notifyUserTokensUpdated, notifyChatMessageReceived, publishOnlineUsersBroadcast } from 'src/services/realtime_events';

export async function onUserTokenCharged(traceId: string, payload: UserTokenChargedPayload): Promise<void> {
    logger.info({ userId: payload.user._id, tokens: payload.user.tokens }, 'iam user_token_charged');

    notifyUserTokensUpdated(traceId, payload.user._id, payload.user.tokens);

    try {
        await updateIamTokens(payload.user._id, payload.user.tokens ?? 0);
        await publishOnlineUsersBroadcast(traceId);
    } catch (error) {
        logger.error(error, 'onUserTokenCharged: falha ao sincronizar tokens no iam');
    }
}

export function onChatMessageSent(traceId: string, payload: ChatMessageSentPayload): void {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId, messageId: payload.message.id }, 'iam chat_message_sent');

    notifyChatMessageReceived(traceId, payload.customerId, payload.attendantId, payload.message);
}
