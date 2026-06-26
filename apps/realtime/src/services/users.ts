import { IOnlineUser, IUser } from "@repo/shared-types";
import { iamApi } from "src/apis/iam";

export const userExists = async (email: string, token: string): Promise<IUser> => {
    const { data } = await iamApi.get<IUser>('/users/exists', {
        headers: { Authorization: token },
        params: { email },
    });
    return data;
};

export const addToIam = async (user: IOnlineUser, token: string): Promise<void> => {
    await iamApi.post('/online-users/add', user, {
        headers: { Authorization: token },
    });
};

export const removeFromIam = async (userId: string, token: string): Promise<void> => {
    await iamApi.delete('/online-users/remove', {
        headers: { Authorization: token },
        data: { id: userId },
    });
};

export const findUserBySlug = async (slug: string): Promise<IUser> => {
    const { data } = await iamApi.get<IUser>('/users/find-by-slug', { params: { slug } });
    return data;
};
