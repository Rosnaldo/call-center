import { apiBack } from '../../api/backend';
import { ChatAttendantment, Message } from '@repo/shared-types';
import { ApiError } from '../../error/api';

export async function fetchMessages(customerId: string, attendantId: string): Promise<ChatAttendantment> {
    const res = await apiBack.get('/chat/get-messages', { params: { customerId, attendantId } });
    if (res.data?.isError) {
        throw new ApiError(res.data.message);
    }
    return res.data as ChatAttendantment;
}

export async function sendMessage(customerId: string, attendantId: string, sender: Message['sender'], text: string): Promise<Message> {
    const res = await apiBack.post('/chat/send-message', { customerId, attendantId, sender, text });
    if (res.data?.isError) {
        throw new ApiError(res.data.message);
    }
    return res.data as Message;
}

export async function sendFile(customerId: string, attendantId: string, sender: Message['sender'], file: File): Promise<Message> {
    const formData = new FormData();
    formData.append('customerId', customerId);
    formData.append('attendantId', attendantId);
    formData.append('sender', sender);
    formData.append('file', file);

    const res = await apiBack.post('/chat/upload-file', formData);
    if (res.data?.isError) {
        throw new ApiError(res.data.message);
    }
    return res.data as Message;
}
