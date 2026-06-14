import { OnlineUserData } from '#websocket/types';

const onlineUsers = new Map<string, OnlineUserData>();

export const addOnlineUser = (user: OnlineUserData): void => {
    onlineUsers.set(user.id, user);
};

export const removeOnlineUser = (userId: string): void => {
    onlineUsers.delete(userId);
};

export const getOnlineUsers = (): OnlineUserData[] => {
    return Array.from(onlineUsers.values());
};
