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
                if (!call) {
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
                if (!call) {
                    await removeFromIam(user.id);
                }

                notifyDisconnectEvent('user_disconnected', user.id, call);
                await endActiveCall(traceId, user.id);

                // endActiveCall now calls iam's /calls/complete (presence
                // reset + Daily room ejection) — but if that call fails, is
                // slow, or the eject itself no-ops (nobody left in the room),
                // presence would otherwise stay stuck on 'in-call' forever
                // since grace_period deliberately never touches status while
                // a call is active. The grace period expiring is exactly the
                // point where we've committed to ending the call regardless,
                // so reset both participants directly here too — repeating
                // the same reset that /calls/complete (or onMeetingEnded
                // later) already did is a harmless no-op.
                broadcastMessage({ event: 'online_users_broadcast', data: {} });
            } catch (error) {
                logger.error(error, 'grace period: falha ao remover usuário do iam');
            }
        },
    );
};
