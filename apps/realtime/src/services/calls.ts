import axios from "axios";
import { CallState } from "@repo/shared-types";
import { createIamClient, iamApi } from "src/apis/iam";
import { parseRoomName } from "src/helpers/parse_room_name";
import { findUserBySlug } from "src/services/users";

export const createCall = async (traceId: string, call: CallState): Promise<CallState> => {
    const { data } = await createIamClient(traceId).post<CallState>('/calls/create', call);
    return data;
};

// Builds a fresh CallState for a room from scratch — used to self-heal when
// a user is confirmed present in a Daily room but redis has no record of it.
export const createCallForRoom = async (traceId: string, roomName: string): Promise<CallState | null> => {
    const parsed = parseRoomName(roomName);
    if (!parsed) return null;

    const [customer, attendant] = await Promise.all([
        findUserBySlug(traceId, parsed.customerSlug),
        findUserBySlug(traceId, parsed.attendantSlug),
    ]);
    if (!customer || !attendant) return null;

    return createCall(traceId, {
        id: `${customer._id}--${attendant._id}`,
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        attendantId: attendant._id,
        attendantName: `${attendant.firstName} ${attendant.lastName}`,
        roomName,
        activeUserIds: [],
        accumulatedMs: 0,
        overlapStartedAt: null,
        startedAt: new Date(),
        endedAt: null,
        isPlaying: false,
        tokensToBeCharged: 0,
    });
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

export const updateCallParticipant = async (traceId: string, customerId: string, attendantId: string, userId: string, joined: boolean): Promise<CallState> => {
    const { data } = await createIamClient(traceId).put<CallState>('/calls/update-participant', { customerId, attendantId, userId, joined });
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

// Refreshes the call's redis TTL without rewriting it — onMeetingStarted and
// /calls/sync are the only two touchpoints; participant join/leave don't.
export const touchCall = async (traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await createIamClient(traceId).put('/calls/touch', { customerId, attendantId });
};

export const trackRoom = async (traceId: string, roomName: string): Promise<void> => {
    await createIamClient(traceId).post('/calls/track-room', { roomName });
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
