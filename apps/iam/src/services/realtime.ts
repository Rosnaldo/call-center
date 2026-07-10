import { IUser, Message } from '@repo/shared-types';
import { createRealtimeClient } from '#apis/realtime';

export async function notifyUserTokenCharged(traceId: string, user: IUser): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'user_token_charged',
        payload: { user },
    });
}

export async function notifyChatMessageSent(traceId: string, customerId: string, attendantId: string, message: Message): Promise<void> {
    await createRealtimeClient(traceId).post('/webhooks/iam', {
        event: 'chat_message_sent',
        payload: { customerId, attendantId, message },
    });
}
