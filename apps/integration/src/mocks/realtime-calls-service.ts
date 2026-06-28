import axios from 'axios';
import { CallState } from '@repo/shared-types';

const api = axios.create();

export function setBaseURL(url: string): void {
    api.defaults.baseURL = url;
}

export function setAuthToken(token: string): void {
    api.defaults.headers.common['Authorization'] = token;
}

export const createCall = async (call: CallState): Promise<CallState> => {
    const { data } = await api.post<CallState>('/calls/create', call);
    return data;
};

export const getCallByRoom = async (roomName: string): Promise<CallState> => {
    const { data } = await api.get<CallState>('/calls/get-by-room', { params: { roomName } });
    return data;
};

export const updateCall = async (customerId: string, attendantId: string, updates: Partial<CallState>): Promise<CallState> => {
    const { data } = await api.put<CallState>('/calls/update', { customerId, attendantId, updates });
    return data;
};

export const deleteCall = async (customerId: string, attendantId: string): Promise<void> => {
    await api.delete('/calls/delete', { data: { customerId, attendantId } });
};
