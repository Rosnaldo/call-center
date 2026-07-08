import { CallState, IOnlineUser } from '@repo/shared-types';
import { graceTimer } from '#websocket/grace_timer';
import { broadcastMessage, sendToUser } from '#websocket/broadcast';
import { endActiveCall, otherParticipantId } from '#websocket/end_active_call';
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

                notifyDisconnectEvent('user_disconnected', user.id, call);
                await endActiveCall(traceId, user.id);

                broadcastMessage({ event: 'online_users_broadcast', data: {} });
            } catch (error) {
                logger.error(error, 'grace period: falha ao remover usuário do iam');
            }
        },
    );
};
