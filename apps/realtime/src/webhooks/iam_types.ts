import { IUser, Message } from '@repo/shared-types';

export interface UserTokenChargedPayload {
    user: IUser;
}

export interface ChatMessageSentPayload {
    customerId: string;
    attendantId: string;
    message: Message;
}

export type IamWebhookBody =
    | { event: 'user_token_charged'; payload: UserTokenChargedPayload }
    | { event: 'chat_message_sent'; payload: ChatMessageSentPayload };
