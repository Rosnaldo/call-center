import { CallState, IUser } from '@repo/shared-types';
import type { OnlineUsersStoreInstance, CallStoreInstance, CallViewStoreInstance, CurrentUserStoreInstance, MeetingStoreInstance } from '../../states/stores';
import { mytoast } from '../../components/toast';
import i18n from '../../i18n.ts';

export type WsUsersMessage =
    | { event: 'online_users_broadcast' }
    | { event: 'user_connected'; data: { call: CallState | null; shouldJoin: boolean } }
    | { event: 'heartbeat_ack' }
    | { event: 'user_logouted'; data: { user: IUser } }
    | { event: 'user_disconnecting'; data: { id: string; call?: CallState } }
    | { event: 'user_disconnected'; data: { id: string; call?: CallState } }
    | { event: 'partner_reconnected'; data: { call: CallState } }
    | { event: 'user_tokens_updated'; data: { id: string; tokens?: number } };

export interface WsUsersStores {
    onlineUsers: OnlineUsersStoreInstance;
    call: CallStoreInstance;
    callView: CallViewStoreInstance;
    currentUser: CurrentUserStoreInstance;
    meeting: MeetingStoreInstance;
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

    private async warnIfPartOfMyCall(user: IUser, messageKey: 'call.participantLoggedOut' | 'call.participantDisconnected'): Promise<void> {
        try {
            mytoast.warn(i18n.t(messageKey, { name: `${user.firstName} ${user.lastName}` }));
        } catch (error) {
            console.error(error);
        }
    }

    handle(msg: { event: string; data?: any }): boolean {
        const { refreshUsers } = this.stores.onlineUsers.getState();

        switch (msg.event) {
            case 'online_users_broadcast':
                refreshUsers();
                return true;
            case 'user_connected':
                this.stores.call.getState().syncActiveCall(msg.data.call, msg.data.shouldJoin);
                return true;
            case 'heartbeat_ack':
                this.cancelAck();
                return true;
            case 'user_logouted':
                this.warnIfPartOfMyCall(msg.data.user, 'call.participantLoggedOut');
                return true;
            case 'user_disconnecting':
                this.stores.meeting.getState().userDisconnecting(msg.data);
                return true;
            case 'user_disconnected':
                this.stores.meeting.getState().userDisconnected(msg.data);
                return true;
            case 'partner_reconnected':
                this.stores.call.getState().partnerReconnected(msg.data.call);
                return true;
            case 'user_tokens_updated':
                this.stores.meeting.getState().userTokensUpdated(msg.data);
                return true;
            default:
                return false;
        }
    }
}
