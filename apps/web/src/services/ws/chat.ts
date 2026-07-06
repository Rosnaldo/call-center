import { Message } from '@repo/shared-types';
import type { ChatStoreInstance } from '../../states/stores';

export type WsChatMessage =
    | { event: 'chat_message_received'; data: { message: Message } };

export interface WsChatStores {
    chat: ChatStoreInstance;
}

export class WsChatService {
    private stores: WsChatStores;

    constructor(stores: WsChatStores) {
        this.stores = stores;
    }

    handle(msg: { event: string; data?: any }): boolean {
        const { addMessage } = this.stores.chat.getState();

        switch (msg.event) {
            case 'chat_message_received':
                addMessage(msg.data.message);
                break;
            default:
                return false;
        }
        return true;
    }
}
