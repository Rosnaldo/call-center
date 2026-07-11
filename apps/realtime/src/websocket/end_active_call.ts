import { CallState } from '@repo/shared-types';
import logger from '#logger';
import { notifyPartnerReconnected as notifyPartnerReconnectedApi } from 'src/services/calls';

export const otherParticipantId = (call: CallState, userId: string): string =>
    call.customerId === userId ? call.attendantId : call.customerId;

// Called when a user's websocket reconnects — grace-timer bookkeeping here
// is the only place that knows this is a genuine reconnect (vs. a fresh
// login), so this stays realtime's job to detect. The actual lookup + who
// gets told is now IAM's — it publishes partner_reconnected over SSE.
export const notifyPartnerReconnected = async (traceId: string, userId: string): Promise<void> => {
    try {
        await notifyPartnerReconnectedApi(traceId, userId);
    } catch (error) {
        logger.error(error, 'ws notifyPartnerReconnected: falha ao notificar parceiro');
    }
};
