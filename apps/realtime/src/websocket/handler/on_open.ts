import { IOnlineUser } from '@repo/shared-types';
import { broadcastMessage } from '#websocket/broadcast';
import { addToIam } from 'src/services/users';
import logger from 'src/logger';

export const handleOpen = async (user: IOnlineUser): Promise<void> => {
    logger.info({ userId: user.id, name: user.name }, 'user connected');
    try {
        await addToIam(user);
        broadcastMessage({ event: 'online_users_broadcast', data: {} });
    } catch (error) {
        logger.error(error, 'handleOpen: falha ao registrar usuário no iam');
    }
};
