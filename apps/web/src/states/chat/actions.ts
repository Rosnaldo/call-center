import { Message } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';
import { ChatStore } from './state.ts';
import { fetchMessages, sendMessage as sendMessageApi, sendFile as sendFileApi } from '@/src/services/api/chat.ts';
import { handleRequestError } from '@/src/utils/utils.ts';

export interface ChatActions {
  openChat: () => void;
  closeChat: () => void;
  addMessage: (message: Message) => void;
  fetchChatMessages: () => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  sendChatFile: (file: File) => Promise<void>;
  resetChat: () => void;
}

export const createChatActions = (
  set: (fn: (state: ChatStore) => Partial<ChatStore>) => void,
  ref: StoresRef,
): ChatActions => {
  return {
    openChat: () => set(() => ({ isOpen: true })),
    closeChat: () => set(() => ({ isOpen: false })),

    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

    fetchChatMessages: async () => {
      try {
        const call = ref.call.getState().call;
        if (!call) return;

        const chat = await fetchMessages(call.customerId, call.attendantId);
        set(() => ({ messages: chat.messages }));
      } catch (error) {
        handleRequestError(error);
      }
    },

    sendChatMessage: async (text: string) => {
      try {
        const call = ref.call.getState().call;
        const currentUser = ref.currentUser.getState().currentUser;
        if (!call || !currentUser) return;

        await sendMessageApi(call.customerId, call.attendantId, currentUser.role === 'attendant' ? 'attendant' : 'customer', text);
      } catch (error) {
        handleRequestError(error);
      }
    },

    sendChatFile: async (file: File) => {
      try {
        const call = ref.call.getState().call;
        const currentUser = ref.currentUser.getState().currentUser;
        if (!call || !currentUser) return;

        await sendFileApi(call.customerId, call.attendantId, currentUser.role === 'attendant' ? 'attendant' : 'customer', file);
      } catch (error) {
        handleRequestError(error);
      }
    },

    resetChat: () => set(() => ({ isOpen: false, messages: [] })),
  };
};
