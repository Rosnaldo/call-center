import { ISocketServer } from '#websocket/socket';
import { IOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { broadcastMessage } from '#websocket/broadcast';
import { addToIam, removeFromIam } from 'src/services/users';

export const createGracePeriod = (
    wss: ISocketServer,
    user: IOnlineUser,
    token: string,
) => (status: 'disconnecting' | 'offline' = 'disconnecting'): void => {
    graceTimer.start(
        user.id,
        () => {
            const transitionUser: IOnlineUser = { ...user, status };
            broadcastMessage(wss, { event: 'online_users_updated', data: transitionUser });
            addToIam(transitionUser, token);
        },
        () => {
            broadcastMessage(wss, { event: 'user_logout', data: { id: user.id } });
            removeFromIam(user.id, token);
        },
    );
};
