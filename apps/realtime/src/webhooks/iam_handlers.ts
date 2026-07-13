import logger from '#logger';
import { UserTokenChargedPayload, ChatMessageSentPayload } from './iam_types';
import { notifyUserTokensUpdated, notifyChatMessageReceived } from 'src/services/realtime_events';

// IAM already patches its own online_user cache and broadcasts the list
// directly when it charges tokens (see charge_token.ts) — this only handles
// realtime's own concern, pushing the per-user SSE event.
export async function onUserTokenCharged(traceId: string, payload: UserTokenChargedPayload): Promise<void> {
    logger.info({ userId: payload.user._id, tokens: payload.user.tokens }, 'iam user_token_charged');

    notifyUserTokensUpdated(traceId, payload.user._id, payload.user.tokens);
}

export function onChatMessageSent(traceId: string, payload: ChatMessageSentPayload): void {
    logger.info({ customerId: payload.customerId, attendantId: payload.attendantId, messageId: payload.message.id }, 'iam chat_message_sent');

    notifyChatMessageReceived(traceId, payload.customerId, payload.attendantId, payload.message);
}
