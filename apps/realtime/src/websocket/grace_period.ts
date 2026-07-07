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
            broadcastMessage({ event: 'add_to_online_users', data: transitionUser });
            addToIam(transitionUser)
        },
        () => {
            broadcastMessage({ event: 'remove_from_online_users', data: user });
            removeFromIam(user.id)
        },
    );
};
