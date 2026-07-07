import { IOnlineUser, IUser } from "@repo/shared-types";
import { createIamClient, iamApi } from "src/apis/iam";

export const userExists = async (traceId: string, email: string, token: string): Promise<IUser> => {
    const { data } = await createIamClient(traceId).get<IUser>('/users/exists', {
        headers: { Authorization: token },
        params: { email },
    });
    return data;
};

export const addToIam = async (user: IOnlineUser): Promise<void> => {
    await iamApi.post('/online-users/add', user);
};

export const removeFromIam = async (userId: string): Promise<void> => {
    await iamApi.delete('/online-users/remove', {
        data: { id: userId },
    });
};

export const updateIamTokens = async (userId: string, tokens: number): Promise<void> => {
    await iamApi.post('/online-users/update-tokens', { id: userId, tokens });
};

export const findUserBySlug = async (traceId: string, slug: string): Promise<IUser> => {
    const { data } = await createIamClient(traceId).get<IUser>('/users/find-by-slug', { params: { slug } });
    return data;
};
