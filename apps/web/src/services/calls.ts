import { apiBack } from '../api/backend';
import { CallState } from '@repo/shared-types';

export async function fetchCall(customerId: string, attendantId: string): Promise<CallState> {
    const res = await apiBack.get<CallState>('/calls/get', { params: { customerId, attendantId } });
    return res.data;
}
