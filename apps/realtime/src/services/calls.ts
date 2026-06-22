import { CallState } from "@repo/shared-types";
import { iamApi } from "src/apis/iam";

export const createCall = async (call: CallState): Promise<CallState | null> => {
    try {
        const { data } = await iamApi.post<CallState>('/calls/create', call);
        return data;
    } catch (err) {
        console.error('[IAM] create call failed:', err);
        return null;
    }
};

export const getCallByRoom = async (roomName: string): Promise<CallState | null> => {
    try {
        const { data } = await iamApi.get<CallState>('/calls/get-by-room', { params: { roomName } });
        return data;
    } catch {
        return null;
    }
};

export const updateCall = async (id: string, updates: Partial<CallState>): Promise<CallState | null> => {
    try {
        const { data } = await iamApi.put<CallState>('/calls/update', { id, updates });
        return data;
    } catch (err) {
        console.error('[IAM] update call failed:', err);
        return null;
    }
};

export const deleteCall = async (id: string): Promise<void> => {
    try {
        await iamApi.delete('/calls/delete', { data: { id } });
    } catch (err) {
        console.error('[IAM] delete call failed:', err);
    }
};
