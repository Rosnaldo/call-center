import { apiBack } from '../../api/backend';
import { OnlineUserState } from '../../states/online-users/state';
import { ApiError } from '../../error/api';

export async function fetchOnlineUsers(): Promise<OnlineUserState[]> {
    const res = await apiBack.get('/online-users/list');
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }
    return (res.data?.users ?? []) as OnlineUserState[];
}

export async function addOnlineUser(user: OnlineUserState): Promise<void> {
    const res = await apiBack.post('/online-users/add', user);
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }
}
