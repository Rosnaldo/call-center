import { syncActiveCall } from 'src/services/calls';

// Shared by onConnection (runs once per new socket) and the 'request_state'
// message handler (a tab without its own socket asking the leader tab to
// re-fetch on its behalf — see InitWs/requestStateSync on the web side).
// IAM's /calls/sync-active-call route publishes the result to the user
// itself now (call_synced, over SSE — see init-call-events.ts), so this is
// only the trigger; nothing here needs to relay the result over the socket.
export const syncAndSendCallState = async (traceId: string, userId: string): Promise<void> => {
    await syncActiveCall(traceId, userId);
};
