import { apiBack } from '../api/backend';
import { CallState } from '@repo/shared-types';

export async function fetchCall(id: string): Promise<CallState> {
    const res = await apiBack.get<CallState>('/calls/get', { params: { id } });
    return res.data;
}
