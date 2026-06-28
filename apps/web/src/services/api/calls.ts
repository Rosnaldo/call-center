import { apiBack } from '../../api/backend';
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
