import { CallState } from "@repo/shared-types";
import { createIamClient, iamApi } from "src/apis/iam";

export const createCall = async (traceId: string, call: CallState): Promise<CallState> => {
    const { data } = await createIamClient(traceId).post<CallState>('/calls/create', call);
    return data;
};

export const getCallByRoom = async (traceId: string, roomName: string): Promise<CallState> => {
    const { data } = await createIamClient(traceId).get<CallState>('/calls/get-by-room', { params: { roomName } });
    return data;
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

export const createCallHistory = async (traceId: string, payload: CallHistoryPayload): Promise<void> => {
    await createIamClient(traceId).post('/call-history/create', payload);
};
