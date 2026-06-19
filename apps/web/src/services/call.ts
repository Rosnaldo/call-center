import { ICall } from '@repo/shared-types';
import { apiBack } from '../api/backend';
import { CallState } from '../states/call/state';

type CreateCallPayload = Pick<CallState, 'customerId' | 'customerName' | 'attendantId' | 'attendantName' | 'roomName'>;

export async function createIamCall(call: CreateCallPayload): Promise<ICall> {
    const res = await apiBack.post<ICall>('/calls/create', {
        customerId: call.customerId,
        customerName: call.customerName,
        attendantId: call.attendantId,
        attendantName: call.attendantName,
        roomName: call.roomName,
    });
    return res.data;
}
