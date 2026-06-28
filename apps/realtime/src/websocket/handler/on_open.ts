import { IOnlineUser } from '@repo/shared-types';
import { broadcastMessage } from '#websocket/broadcast';
import { addToIam } from 'src/services/users';

export const handleOpen = (user: IOnlineUser): void => {
    broadcastMessage({ event: 'add_to_online_users', data: user });
    addToIam(user).catch(() => {});
};
