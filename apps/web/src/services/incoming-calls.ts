import { apiBack } from '../api/backend';
import { ApiError } from '../error/api';

export async function sendIncomingCall(customerId: string, attendantId: string): Promise<void> {
    const res = await apiBack.post('/incoming-calls/send', { customerId, attendantId, whoIsCalling: 'customer' });
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }
}

export async function cancelIncomingCall(customerId: string, attendantId: string): Promise<void> {
    const res = await apiBack.post('/incoming-calls/cancel', { customerId, attendantId });
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }
}

export async function acceptIncomingCall(attendantId: string): Promise<void> {
    const res = await apiBack.post('/incoming-calls/accept', { attendantId, userId: attendantId });
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }
}
