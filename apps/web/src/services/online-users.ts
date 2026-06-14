import { apiBack } from '../api/backend';
import { OnlineUserState } from '../states/online-users/state';

export async function fetchOnlineUsers(): Promise<OnlineUserState[]> {
    const res = await apiBack.get('/online-users/list');
    return (res.data?.users ?? []) as OnlineUserState[];
}

export async function addOnlineUser(user: OnlineUserState): Promise<void> {
    await apiBack.post('/online-users/add', user);
}
