import { IOnlineUser } from '@repo/shared-types';
import { broadcastMessage } from '#websocket/broadcast';
import { addToIam } from 'src/services/users';

export const handleOpen = (user: IOnlineUser, token: string): void => {
    broadcastMessage({ event: 'online_users_updated', data: user });
    addToIam(user, token).catch(() => {});
};
