import { CallState } from "@repo/shared-types";
import { createIamClient } from "src/apis/iam";

export const createCall = async (traceId: string, call: CallState): Promise<CallState> => {
    const { data } = await createIamClient(traceId).post<CallState>('/calls/create', call);
    return data;
};

export const getCallByRoom = async (traceId: string, roomName: string): Promise<CallState> => {
    const { data } = await createIamClient(traceId).get<CallState>('/calls/get-by-room', { params: { roomName } });
    return data;
};

export const updateCall = async (traceId: string, customerId: string, attendantId: string, updates: Partial<CallState>): Promise<CallState> => {
    const { data } = await createIamClient(traceId).put<CallState>('/calls/update', { customerId, attendantId, updates });
    return data;
};

export const deleteCall = async (traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await createIamClient(traceId).delete('/calls/delete', { data: { customerId, attendantId } });
};

export const trackRoom = async (traceId: string, roomName: string): Promise<void> => {
    await createIamClient(traceId).post('/calls/track-room', { roomName });
};

export const completeCall = async (traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await createIamClient(traceId).post('/calls/complete', { customerId, attendantId });
};

export const createCallHistory = async (traceId: string, call: CallState): Promise<void> => {
    await createIamClient(traceId).post('/call-history/create', {
        callId: call.id,
        customerId: call.customerId,
        customerName: call.customerName,
        attendantId: call.attendantId,
        attendantName: call.attendantName,
        roomName: call.roomName,
        meetingId: call.meetingId,
        accumulatedMs: call.accumulatedMs,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        tokensToBeCharged: call.tokensToBeCharged,
    });
};
