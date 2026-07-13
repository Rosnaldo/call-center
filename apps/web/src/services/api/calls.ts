import { apiBack } from '../../api/backend';
import { ApiError } from '../../error/api';

export async function completeCall(customerId: string, attendantId: string): Promise<void> {
    const res = await apiBack.post('/calls/complete', { customerId, attendantId });
    if (res.data?.isError) {
        throw new ApiError(res.data.message);
    }
}
