import { IOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { broadcastMessage } from '#websocket/broadcast';
import { addToIam, removeFromIam } from 'src/services/users';

export const createGracePeriod = (
    user: IOnlineUser,
) => (status: 'disconnecting' | 'offline' = 'disconnecting'): void => {
    graceTimer.start(
        user.id,
        () => {
            const transitionUser: IOnlineUser = { ...user, status: status };
            broadcastMessage({ event: 'online_users_updated', data: transitionUser });
            addToIam(transitionUser).catch(() => {});
        },
        () => {
            broadcastMessage({ event: 'user_logout', data: { id: user.id } });
            removeFromIam(user.id).catch(() => {});
        },
    );
};
