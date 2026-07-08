import axios from "axios";
import { CallState } from "@repo/shared-types";
import { createIamClient, iamApi } from "src/apis/iam";

export const createCall = async (traceId: string, call: CallState): Promise<CallState> => {
    const { data } = await createIamClient(traceId).post<CallState>('/calls/create', call);
    return data;
};

export const getCallByRoom = async (traceId: string, roomName: string): Promise<CallState | null> => {
    try {
        const { data } = await createIamClient(traceId).get<CallState>('/calls/get-by-room', { params: { roomName } });
        return data;
    } catch (error) {
        // Only treat "call não encontrada" (400) as absence — other failures
        // (network blip, 500) must propagate, otherwise callers would treat a
        // transient read error as "no call" and overwrite real state via createCall.
        if (axios.isAxiosError(error) && error.response?.status === 400) return null;
        throw error;
    }
};

export const getCallByUser = async (userId: string): Promise<CallState | null> => {
    try {
        const { data } = await iamApi.get<CallState>('/calls/get-by-user', { params: { userId } });
        return data;
    } catch {
        return null;
    }
};

export const updateCall = async (traceId: string, customerId: string, attendantId: string, updates: Partial<CallState>): Promise<CallState> => {
    const { data } = await createIamClient(traceId).put<CallState>('/calls/update', { customerId, attendantId, updates });
    return data;
};

export const addParticipant = async (traceId: string, customerId: string, attendantId: string, userId: string): Promise<CallState> => {
    const { data } = await createIamClient(traceId).put<CallState>('/calls/add-participant', { customerId, attendantId, userId });
    return data;
};

export const removeParticipant = async (traceId: string, customerId: string, attendantId: string, userId: string): Promise<CallState> => {
    const { data } = await createIamClient(traceId).put<CallState>('/calls/remove-participant', { customerId, attendantId, userId });
    return data;
};

export const deleteCall = async (traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await createIamClient(traceId).delete('/calls/delete', { data: { customerId, attendantId } });
};

// Centralizes call finalization in iam's /calls/complete (presence reset +
// Daily room ejection) instead of the realtime side ejecting on its own —
// used when a call needs to be ended off a websocket-only signal (logout,
// grace period expiry) rather than the client's own completeCall action.
export const completeCall = async (traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await createIamClient(traceId).post('/calls/complete', { customerId, attendantId });
};

export const trackRoom = async (traceId: string, roomName: string): Promise<void> => {
    await createIamClient(traceId).post('/calls/track-room', { roomName });
};

export interface SyncActiveCallResult {
    call: CallState | null;
    shouldJoin: boolean;
}

// Called once per websocket connect (see connection.ts) — iam reconciles its
// own redis call state against real Daily presence and tells us whether the
// connecting user needs to (re)join their Daily room. The result is pushed
// to that user as a `user_connected` event; nothing on the client calls this
// directly.
export const syncActiveCall = async (traceId: string, userId: string): Promise<SyncActiveCallResult> => {
    const { data } = await createIamClient(traceId).post<SyncActiveCallResult>('/calls/sync-active-call', { userId });
    return data;
};

export interface CallHistoryPayload {
    callId: string;
    customerId: string;
    customerName: string;
    attendantId: string;
    attendantName: string;
    roomName: string;
    meetingId: string;
    accumulatedMs: number;
    startedAt: Date | null;
    endedAt: Date | null;
    tokensToBeCharged: number;
}

// Returns false when the meetingId was already recorded (Daily redelivered the
// meeting.ended webhook) — callers should skip billing/cleanup again in that case.
export const createCallHistory = async (traceId: string, payload: CallHistoryPayload): Promise<boolean> => {
    try {
        await createIamClient(traceId).post('/call-history/create', payload);
        return true;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) return false;
        throw error;
    }
};
