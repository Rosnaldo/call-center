import { IOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { getCallByUser } from 'src/services/calls';
import { removeFromIam, updateOnlineUserStatus } from 'src/services/users';
import { notifyUserDisconnecting, notifyUserDisconnected, publishOnlineUsersBroadcast } from 'src/services/realtime_events';
import logger from '#logger';

export const createGracePeriod = (
    user: IOnlineUser,
    traceId: string,
) => (): void => {
    graceTimer.start(
        user.id,
        async () => {
            try {
                const call = await getCallByUser(user.id);
                if (call) {
                    await updateOnlineUserStatus(traceId, user.id, 'disconnecting');
                }
                notifyUserDisconnecting(traceId, user.id, call);
                await publishOnlineUsersBroadcast(traceId);
            } catch (error) {
                logger.error(error, 'grace period: falha ao propagar status do usuário');
            }
        },
        async () => {
            try {
                const call = await getCallByUser(user.id);
                await removeFromIam(user.id);

                // Ending the call itself is no longer this grace period's
                // job — /calls/complete is only ever called from the web
                // client's own "end call" action now. A call whose partner
                // never comes back just stays active until the other
                // participant explicitly ends it.
                notifyUserDisconnected(traceId, user.id, call);

                await publishOnlineUsersBroadcast(traceId);
            } catch (error) {
                logger.error(error, 'grace period: falha ao remover usuário do iam');
            }
        },
    );
};
