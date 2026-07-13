import { Message } from '@repo/shared-types';

export interface ChatStore {
  isOpen: boolean;
  messages: Message[];
  hasUnreadMessage: boolean;
}

export const initialChatStore: ChatStore = {
  isOpen: false,
  messages: [],
  hasUnreadMessage: false,
};
