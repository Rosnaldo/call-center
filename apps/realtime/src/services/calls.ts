import axios from "axios";
import { CallState } from "@repo/shared-types";
import { createIamClient } from "src/apis/iam";
import * as callsRedis from './calls_redis';
import { notifyCallUpdate } from './call_events';

// Not imported from #websocket/end_active_call — that module imports
// notifyPartnerReconnected from here, and a two-line helper isn't worth a
// circular import.
const otherParticipantId = (call: CallState, userId: string): string =>
    call.customerId === userId ? call.attendantId : call.customerId;

export const createCall = async (_traceId: string, call: CallState): Promise<CallState> => {
    return callsRedis.createCall(call);
};

export const getCallByRoom = async (_traceId: string, roomName: string): Promise<CallState | null> => {
    return callsRedis.getCallByRoom(roomName);
};

export const getCallByUser = async (userId: string): Promise<CallState | null> => {
    return callsRedis.getCallByUser(userId);
};

export const updateCall = async (_traceId: string, customerId: string, attendantId: string, updates: Partial<CallState>): Promise<CallState | null> => {
    return callsRedis.updateCall(customerId, attendantId, updates);
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
    await callsRedis.deleteCall(customerId, attendantId);
    notifyCallUpdate(traceId, [customerId, attendantId], null);
};

export const trackRoom = async (_traceId: string, roomName: string): Promise<void> => {
    await callsRedis.trackRoom(roomName);
};

export interface SyncActiveCallResult {
    call: CallState | null;
}

// Called once per websocket connect (see connection.ts) — iam reconciles its
// own redis call state against real Daily presence (Mongo-dependent
// self-heal, stays server-to-server HTTP). IAM publishes the result to that
// user directly (call_synced, over SSE — see init-call-events.ts); nothing
// on the client calls this directly.
export const syncActiveCall = async (traceId: string, userId: string): Promise<SyncActiveCallResult> => {
    const { data } = await createIamClient(traceId).post<SyncActiveCallResult>('/calls/sync-active-call', { userId });
    return data;
};

// Called when a user's websocket reconnects and our own grace-timer
// bookkeeping (see grace_period.ts) shows it's a genuine reconnect, not a
// fresh login — pure Redis read + relay, no computed state, so this runs
// directly instead of round-tripping to IAM.
export const notifyPartnerReconnected = async (traceId: string, userId: string): Promise<void> => {
    const call = await callsRedis.getCallByUser(userId);
    if (!call) return;
    notifyCallUpdate(traceId, [otherParticipantId(call, userId)], call);
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
