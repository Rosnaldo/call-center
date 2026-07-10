import { CallState, IOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { broadcastMessage, sendToUser } from '#websocket/broadcast';
import { otherParticipantId } from '#websocket/end_active_call';
import { getCallByUser } from 'src/services/calls';
import { removeFromIam, updateOnlineUserStatus } from 'src/services/users';
import logger from '#logger';


const notifyDisconnectEvent = (event: 'user_disconnecting' | 'user_disconnected', userId: string, call: CallState | null): void => {
    const data = call ? { id: userId, call } : { id: userId };

    sendToUser(userId, { event, data });
    if (call) {
        sendToUser(otherParticipantId(call, userId), { event, data });
    }
};

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
                notifyDisconnectEvent('user_disconnecting', user.id, call);
                broadcastMessage({ event: 'online_users_broadcast', data: {} });
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
                notifyDisconnectEvent('user_disconnected', user.id, call);

                broadcastMessage({ event: 'online_users_broadcast', data: {} });
            } catch (error) {
                logger.error(error, 'grace period: falha ao remover usuário do iam');
            }
        },
    );
};
