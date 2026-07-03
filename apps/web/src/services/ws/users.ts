import { IOnlineUser } from '@repo/shared-types';
import type { OnlineUsersStoreInstance } from '../../states/stores';

export type WsUsersMessage =
    | { event: 'add_to_online_users'; data: IOnlineUser }
    | { event: 'online_users_broadcast' }
    | { event: 'heartbeat_ack' }
    | { event: 'user_logout'; data: { id: string } }
    | { event: 'user_tokens_updated'; data: { id: string; tokens?: number } };

export interface WsUsersStores {
    onlineUsers: OnlineUsersStoreInstance;
}

export class WsUsersService {
    private stores: WsUsersStores;
    private heartbeatRef: ReturnType<typeof setInterval> | null = null;
    private ackRef: ReturnType<typeof setTimeout> | null = null;

    constructor(stores: WsUsersStores) {
        this.stores = stores;
    }

    startHeartbeat(sendHeartbeat: () => void, onTimeout: () => void, intervalMs: number, ackTimeoutMs: number): void {
        if (this.heartbeatRef) return;
        this.heartbeatRef = setInterval(() => {
            sendHeartbeat();
            this.armAck(onTimeout, ackTimeoutMs);
        }, intervalMs);
    }

    stopHeartbeat(): void {
        if (this.heartbeatRef) clearInterval(this.heartbeatRef);
        this.heartbeatRef = null;
        this.cancelAck();
    }

    private armAck(onTimeout: () => void, ackTimeoutMs: number): void {
        if (this.ackRef) clearTimeout(this.ackRef);
        this.ackRef = setTimeout(onTimeout, ackTimeoutMs);
    }

    private cancelAck(): void {
        if (this.ackRef) clearTimeout(this.ackRef);
        this.ackRef = null;
    }

    handle(msg: { event: string; data?: any }): boolean {
        const { addToOnlineUsers, refreshUsers, removeFromOnlineUsers, updateUser } = this.stores.onlineUsers.getState();

        switch (msg.event) {
            case 'add_to_online_users':
                addToOnlineUsers(msg.data);
                return true;
            case 'online_users_broadcast':
                refreshUsers();
                return true;
            case 'heartbeat_ack':
                this.cancelAck();
                return true;
            case 'user_logout':
                removeFromOnlineUsers(msg.data.id);
                return true;
            case 'user_tokens_updated':
                updateUser(msg.data.id, { tokens: msg.data.tokens });
                return true;
            default:
                return false;
        }
    }
}
