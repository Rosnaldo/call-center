import { CallState } from '@repo/shared-types';
import logger from '#logger';
import { sendToUser } from '#websocket/broadcast';
import { getCallByUser } from 'src/services/calls';

export const otherParticipantId = (call: CallState, userId: string): string =>
    call.customerId === userId ? call.attendantId : call.customerId;

// Called when a user's websocket reconnects — if they're in an active call,
// tell their partner directly (sendToUser, not a broadcast) so only that one
// client reacts, instead of every connected user re-syncing on someone
// else's unrelated reconnect.
export const notifyPartnerReconnected = async (userId: string): Promise<void> => {
    try {
        const call = await getCallByUser(userId);
        if (!call) return;

        sendToUser(otherParticipantId(call, userId), { event: 'partner_reconnected', data: { call } });
    } catch (error) {
        logger.error(error, 'ws notifyPartnerReconnected: falha ao notificar parceiro');
    }
};
