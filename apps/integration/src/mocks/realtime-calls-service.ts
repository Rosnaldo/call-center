import { CallState } from '@repo/shared-types';
import { api, setBaseURL, setAuthToken } from './shared-iam-api';

export { setBaseURL, setAuthToken };

export const createCall = async (_traceId: string, call: CallState): Promise<CallState> => {
    const { data } = await api.post<CallState>('/calls/create', call);
    return data;
};

export const getCallByRoom = async (_traceId: string, roomName: string): Promise<CallState> => {
    const { data } = await api.get<CallState>('/calls/get-by-room', { params: { roomName } });
    return data;
};

export const updateCall = async (_traceId: string, customerId: string, attendantId: string, updates: Partial<CallState>): Promise<CallState> => {
    const { data } = await api.put<CallState>('/calls/update', { customerId, attendantId, updates });
    return data;
};

export const deleteCall = async (_traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await api.delete('/calls/delete', { data: { customerId, attendantId } });
};

export const trackRoom = async (_traceId: string, roomName: string): Promise<void> => {
    await api.post('/calls/track-room', { roomName });
};

export const getAndDeleteRooms = async (_traceId: string): Promise<string[]> => {
    const { data } = await api.delete<{ rooms: string[] }>('/calls/rooms');
    return data.rooms;
};

export const getCallByUser = async (userId: string): Promise<CallState | null> => {
    try {
        const { data } = await api.get<CallState>('/calls/get-by-user', { params: { userId } });
        return data;
    } catch {
        return null;
    }
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

export const createCallHistory = async (_traceId: string, payload: CallHistoryPayload): Promise<void> => {
    await api.post('/call-history/create', payload);
};
