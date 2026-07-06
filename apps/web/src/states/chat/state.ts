import { Message } from '@repo/shared-types';

export interface ChatStore {
  isOpen: boolean;
  messages: Message[];
}

export const initialChatStore: ChatStore = {
  isOpen: false,
  messages: [],
};
