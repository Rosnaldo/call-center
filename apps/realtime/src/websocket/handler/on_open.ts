import { IOnlineUser } from '@repo/shared-types';
import { broadcastMessage } from '#websocket/broadcast';
import { addToIam } from 'src/services/users';
import logger from 'src/logger';

export const handleOpen = (user: IOnlineUser): void => {
    logger.info({ userId: user.id, name: user.name }, 'user connected');
    broadcastMessage({ event: 'add_to_online_users', data: user });
    addToIam(user).catch(() => {});
};
