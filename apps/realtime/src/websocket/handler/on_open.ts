import { ISocketServer } from '#websocket/socket';
import { IOnlineUser } from '@repo/shared-types';
import { broadcastMessage } from '#websocket/broadcast';
import { addToIam } from 'src/services/users';

export const handleOpen = (wss: ISocketServer, user: IOnlineUser, token: string): void => {
    broadcastMessage(wss, { event: 'online_users_updated', data: user });
    addToIam(user, token);
};
