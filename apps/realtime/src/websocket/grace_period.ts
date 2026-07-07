import { IOnlineUser, mapUserToOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { broadcastMessage } from '#websocket/broadcast';
import { addToIam, removeFromIam, findUserBySlug } from 'src/services/users';
import logger from '#logger';

export const createGracePeriod = (
    user: IOnlineUser,
    traceId: string,
) => (status: 'disconnecting' | 'offline' = 'disconnecting'): void => {
    graceTimer.start(
        user.id,
        async () => {
            try {
                // `user` is the snapshot captured when this websocket connected,
                // which can be long stale (e.g. its tokens balance may have
                // since been charged) — refetch before writing to Redis so this
                // presence transition doesn't persist a stale value. Clients
                // don't receive this payload directly; they just get told to
                // refetch the list, so they always see whatever ends up here.
                let transitionUser: IOnlineUser;
                try {
                    const freshUser = await findUserBySlug(traceId, user.slug);
                    transitionUser = mapUserToOnlineUser(freshUser, { status });
                } catch {
                    transitionUser = { ...user, status };
                }

                await addToIam(transitionUser);
                broadcastMessage({ event: 'online_users_broadcast', data: {} });
            } catch (error) {
                logger.error(error, 'grace period: falha ao propagar status do usuário');
            }
        },
        async () => {
            try {
                await removeFromIam(user.id);
                broadcastMessage({ event: 'online_users_broadcast', data: {} });
            } catch (error) {
                logger.error(error, 'grace period: falha ao remover usuário do iam');
            }
        },
    );
};
