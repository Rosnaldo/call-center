import { createIamClient } from '#apis/iam';

export interface IamValidateResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

export async function verifyToken(traceId: string, token: string): Promise<IamValidateResponse> {
    const response = await createIamClient(traceId).post<IamValidateResponse>('/auth/validate-token', {}, {
        headers: { Authorization: token },
    });
    return response.data;
}
