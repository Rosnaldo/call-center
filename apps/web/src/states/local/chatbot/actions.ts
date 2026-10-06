import { ChatbotMessage, ChatbotState } from './state.ts';

export interface ChatbotActions {
  addMessage: (message: ChatbotMessage) => void;
  resetChatbot: () => void;
}

export const createChatbotActions = (
  set: (fn: (state: ChatbotState) => Partial<ChatbotState>) => void
): ChatbotActions => {
  return {
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    resetChatbot: () => set(() => ({ messages: [] })),
  };
};
