import { IOnlineUser } from '@repo/shared-types';
import type { OnlineUsersStoreInstance, CallStoreInstance, CurrentUserStoreInstance } from '../../states/stores';
import { fetchCallByUser } from '../api/calls.ts';
import { mytoast } from '../../components/toast';
import i18n from '../../i18n.ts';

export type WsUsersMessage =
    | { event: 'add_to_online_users'; data: IOnlineUser }
    | { event: 'remove_from_online_users'; data: IOnlineUser }
    | { event: 'online_users_broadcast' }
    | { event: 'heartbeat_ack' }
    | { event: 'user_logouted'; data: { id: string } }
    | { event: 'user_disconnected'; data: { id: string } }
    | { event: 'user_tokens_updated'; data: { id: string; tokens?: number } };

export interface WsUsersStores {
    onlineUsers: OnlineUsersStoreInstance;
    call: CallStoreInstance;
    currentUser: CurrentUserStoreInstance;
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

    private warnIfPartOfMyCall(departedUserId: string, messageKey: 'call.participantLoggedOut' | 'call.participantDisconnected'): void {
        const currentUser = this.stores.currentUser.getState().currentUser;
        if (!currentUser || departedUserId === currentUser.id) return;

        fetchCallByUser(currentUser.id).then((call) => {
            if (call && (call.customerId === departedUserId || call.attendantId === departedUserId)) {
                mytoast.warn(i18n.t(messageKey));
            }
        });
    }

    handle(msg: { event: string; data?: any }): boolean {
        const { addToOnlineUsers, refreshUsers, removeFromOnlineUsers, updateUser } = this.stores.onlineUsers.getState();

        switch (msg.event) {
            case 'add_to_online_users':
                addToOnlineUsers(msg.data);
                return true;
            case 'remove_from_online_users':
                removeFromOnlineUsers(msg.data.id);
                return true;
            case 'online_users_broadcast':
                refreshUsers();
                return true;
            case 'heartbeat_ack':
                this.cancelAck();
                return true;
            case 'user_logouted':
                this.warnIfPartOfMyCall(msg.data.id, 'call.participantLoggedOut');
                return true;
            case 'user_disconnected':
                this.warnIfPartOfMyCall(msg.data.id, 'call.participantDisconnected');
                return true;
            case 'user_tokens_updated':
                updateUser(msg.data.id, { tokens: msg.data.tokens });
                return true;
            default:
                return false;
        }
    }
}
