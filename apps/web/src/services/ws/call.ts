import { IncomingCallState } from '@repo/shared-types';
import type { CallStoreInstance, CallViewStoreInstance, IncomingCallStoreInstance, OnlineUsersStoreInstance } from '../../states/stores';

export type WsCallMessage =
    | { event: 'incoming_call_sent'; data: { incomingCall: IncomingCallState } }
    | { event: 'incoming_call_received'; data: { incomingCall: IncomingCallState } }
    | { event: 'incoming_call_cancelled'; data: { targetUserId: string } }
    | { event: 'call_accepted'; data: { incomingCall: IncomingCallState } }
    | { event: 'call_accepted_broadcast' }
    | { event: 'call_completed' }
    | { event: 'call_completed_broadcast' };

export interface WsCallStores {
    call: CallStoreInstance;
    callView: CallViewStoreInstance;
    incomingCall: IncomingCallStoreInstance;
    onlineUsers: OnlineUsersStoreInstance;
}

export class WsCallService {
    private stores: WsCallStores;

    constructor(stores: WsCallStores) {
        this.stores = stores;
    }

    handle(msg: { event: string; data?: any }): boolean {
        const { incomingCallAccepted, completeCall } = this.stores.call.getState();
        const { refreshUsers } = this.stores.onlineUsers.getState();
        const { incomingCallCancelled, incomingCallSent, incomingCallReceived } = this.stores.incomingCall.getState();

        switch (msg.event) {
            case 'incoming_call_sent':
                incomingCallSent?.(msg.data.incomingCall);
                break;
            case 'incoming_call_received':
                incomingCallReceived?.(msg.data.incomingCall);
                break;
            case 'incoming_call_cancelled':
                incomingCallCancelled?.();
                break;
            case 'call_accepted':
                incomingCallAccepted?.(msg.data.incomingCall);
                break;
            case 'call_accepted_broadcast':
                refreshUsers();
                break;
            case 'call_completed':
                completeCall();
            case 'call_completed_broadcast':
                refreshUsers();
                break;
            default:
                return false;
        }
        return true;
    }
}
