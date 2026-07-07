import logger from '#logger';
import { getCallByUser } from 'src/services/calls';
import { deleteDailyRoom } from 'src/webhooks/daily_manager';

export const endActiveCall = async (userId: string): Promise<void> => {
    try {
        const call = await getCallByUser(userId);
        if (!call) return;

        await deleteDailyRoom(call.roomName);
    } catch (error) {
        logger.error(error, 'ws endActiveCall: falha ao encerrar chamada ativa no daily');
    }
};
