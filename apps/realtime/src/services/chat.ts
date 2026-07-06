import { createIamClient } from "src/apis/iam";

export const deleteChat = async (traceId: string, customerId: string, attendantId: string): Promise<void> => {
    await createIamClient(traceId).delete('/chat/delete', { data: { customerId, attendantId } });
};
