import axios from 'axios';
import { CallState } from '@repo/shared-types';
import { api, setBaseURL, setAuthToken } from './shared-iam-api';

export { setBaseURL, setAuthToken };

export const createCall = async (_traceId: string, call: CallState): Promise<CallState> => {
    const { data } = await api.post<CallState>('/calls/create', call);
    return data;
};

export const getCallByRoom = async (_traceId: string, roomName: string): Promise<CallState | null> => {
    try {
        const { data } = await api.get<CallState>('/calls/get-by-room', { params: { roomName } });
        return data;
    } catch {
        return null;
    }
};

export const createCallForRoom = async (_traceId: string, _roomName: string): Promise<CallState | null> => null;

export const touchCall = async (_traceId: string, _customerId: string, _attendantId: string): Promise<void> => {};

export const updateCall = async (_traceId: string, customerId: string, attendantId: string, updates: Partial<CallState>): Promise<CallState> => {
    const { data } = await api.put<CallState>('/calls/update', { customerId, attendantId, updates });
    return data;
};

export const updateCallParticipant = async (_traceId: string, customerId: string, attendantId: string, userId: string, joined: boolean): Promise<CallState> => {
    const { data } = await api.put<CallState>('/calls/update-participant', { customerId, attendantId, userId, joined });
    return data;
};

export const deleteCall = async (_traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await api.delete('/calls/delete', { data: { customerId, attendantId } });
};

export const trackRoom = async (_traceId: string, roomName: string): Promise<void> => {
    await api.post('/calls/track-room', { roomName });
};

export const completeCall = async (_traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await api.post('/calls/complete', { customerId, attendantId });
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

export const createCallHistory = async (_traceId: string, payload: CallHistoryPayload): Promise<boolean> => {
    try {
        await api.post('/call-history/create', payload);
        return true;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) return false;
        throw error;
    }
};
