import { IOnlineUser, IUser } from "@repo/shared-types";
import { iamApi } from "src/apis/iam";

export const userExists = async (email: string): Promise<IUser> => {
    const { data } = await iamApi.get<IUser>('/users/exists', {
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

export const findUserBySlug = async (slug: string): Promise<IUser> => {
    const { data } = await iamApi.get<IUser>('/users/find-by-slug', { params: { slug } });
    return data;
};
