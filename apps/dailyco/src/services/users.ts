import { IOnlineUser, IUser } from "@repo/shared-types";
import { iamApi } from "src/apis/iam";

export const userExists = async (email: string, token: string): Promise<IUser> => {
    const response = await iamApi.get<IUser>('/users/exists', {
        headers: { Authorization: token },
        params: { email },
    });
    return response.data;
};

export const addToIam = (user: IOnlineUser, token: string): void => {
    iamApi.post('/online-users/add', user, {
        headers: { Authorization: token },
    }).catch((err) => console.error('[IAM] sync failed:', err));
};

export const removeFromIam = (userId: string, token: string): void => {
    iamApi.delete('/online-users/remove', {
        headers: { Authorization: token },
        data: { id: userId },
    }).catch((err) => console.error('[IAM] remove failed:', err));
};
