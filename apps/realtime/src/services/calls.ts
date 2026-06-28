import { CallState } from "@repo/shared-types";
import { iamApi } from "src/apis/iam";

export const createCall = async (call: CallState): Promise<CallState> => {
    const { data } = await iamApi.post<CallState>('/calls/create', call);
    return data;
};

export const getCallByRoom = async (roomName: string): Promise<CallState> => {
    const { data } = await iamApi.get<CallState>('/calls/get-by-room', { params: { roomName } });
    return data;
};

export const updateCall = async (customerId: string, attendantId: string, updates: Partial<CallState>): Promise<CallState> => {
    const { data } = await iamApi.put<CallState>('/calls/update', { customerId, attendantId, updates });
    return data;
};

export const deleteCall = async (customerId: string, attendantId: string): Promise<void> => {
    await iamApi.delete('/calls/delete', { data: { customerId, attendantId } });
};

export const trackRoom = async (roomName: string): Promise<void> => {
    await iamApi.post('/calls/track-room', { roomName });
};

export const getAndDeleteRooms = async (): Promise<string[]> => {
    const { data } = await iamApi.delete<{ rooms: string[] }>('/calls/rooms');
    return data.rooms;
};
