import { IOnlineUser } from '@repo/shared-types';
import type { OnlineUsersStoreInstance } from '../../states/stores';

export type WsUsersMessage =
    | { event: 'online_users_updated'; data: IOnlineUser }
    | { event: 'heartbeat_ack' }
    | { event: 'user_logout'; data: { id: string } };

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
        const { upsertUser, removeUser } = this.stores.onlineUsers.getState();

        switch (msg.event) {
            case 'online_users_updated':
                upsertUser(msg.data);
                return true;
            case 'heartbeat_ack':
                this.cancelAck();
                return true;
            case 'user_logout':
                removeUser(msg.data.id);
                return true;
            default:
                return false;
        }
    }
}
