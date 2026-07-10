import { syncActiveCall } from 'src/services/calls';
import { sendToUser } from '#websocket/broadcast';

// Shared by onConnection (runs once per new socket) and the 'request_state'
// message handler (a tab without its own socket asking the leader tab to
// re-fetch on its behalf — see InitWs/requestStateSync on the web side).
export const syncAndSendCallState = async (traceId: string, userId: string): Promise<void> => {
    const { call, shouldJoin } = await syncActiveCall(traceId, userId);
    sendToUser(userId, { event: 'user_connected', data: { call, shouldJoin } });
};
