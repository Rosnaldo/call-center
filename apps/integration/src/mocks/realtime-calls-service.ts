import axios from 'axios';
import { CallState } from '@repo/shared-types';

const api = axios.create();

export function setBaseURL(url: string): void {
    api.defaults.baseURL = url;
}

export function setAuthToken(token: string): void {
    api.defaults.headers.common['Authorization'] = token;
}

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

export const completeCall = async (_traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await api.post('/calls/complete', { customerId, attendantId });
};

export const createCallHistory = async (_traceId: string, call: CallState): Promise<void> => {
    await api.post('/call-history/create', {
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

export const getAndDeleteRooms = async (_traceId: string): Promise<string[]> => {
    const { data } = await api.delete<{ rooms: string[] }>('/calls/rooms');
    return data.rooms;
};
