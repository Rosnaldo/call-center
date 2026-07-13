import { IOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { getCallByUser } from 'src/services/calls';
import { removeFromIam, updateOnlineUserStatus } from 'src/services/users';
import { notifyUserDisconnecting, notifyUserDisconnected, publishOnlineUsersBroadcast } from 'src/services/realtime_events';
import { ejectParticipant } from 'src/webhooks/daily_manager';
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
                    // Fire-and-forget — ejectParticipant already swallows its
                    // own errors (see daily_manager.ts) and the partner
                    // shouldn't wait on a Daily API round trip just to be
                    // told their call partner is disconnecting.
                    await ejectParticipant(call.roomName, user.id);
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
                notifyUserDisconnected(traceId, user.id, call);

                await publishOnlineUsersBroadcast(traceId);
            } catch (error) {
                logger.error(error, 'grace period: falha ao remover usuário do iam');
            }
        },
    );
};
