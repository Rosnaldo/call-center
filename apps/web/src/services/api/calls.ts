import { apiBack } from '../../api/backend';
import { apiRealtime } from '../../api/realtime';
import { CallState } from '@repo/shared-types';
import { ApiError } from '../../error/api';

export async function fetchCall(customerId: string, attendantId: string): Promise<CallState> {
    const res = await apiBack.get('/calls/get', { params: { customerId, attendantId } });
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }
    return res.data as CallState;
}

export async function completeCall(customerId: string, attendantId: string): Promise<void> {
    const res = await apiBack.post('/calls/complete', { customerId, attendantId });
    if (res.data?.isError) {
        throw new ApiError(res.data.message);
    }
}

export async function fetchCallByUser(userId: string): Promise<CallState | null> {
    try {
        const res = await apiBack.get('/calls/get-by-user', { params: { userId } });
        if (res.data?.isError) return null;
        return res.data as CallState;
    } catch {
        return null;
    }
}

export interface SyncCallResult {
    call: CallState | null;
    shouldJoin: boolean;
}

// roomName: the Daily room the client's own daily-js object is currently
// connected to, if any — lets the server self-heal a call record that's
// missing in redis but genuinely ongoing. Omit it when there's nothing
// connected yet (e.g. right on app boot).
export async function syncCall(roomName?: string): Promise<SyncCallResult | null> {
    try {
        const res = await apiRealtime.post('/calls/sync', { roomName });
        if (res.data?.isError) return null;
        return res.data as SyncCallResult;
    } catch {
        return null;
    }
}
