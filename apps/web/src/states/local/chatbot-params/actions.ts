import { ChatbotParams, ChatbotParamsState } from './state.ts';

export interface ChatbotParamsActions {
  setParams: (params: ChatbotParams) => void;
  // Keeps the finished conversation's params (persisted to localStorage).
  setSavedParams: (params: ChatbotParams) => void;
  // A new conversation; the kept params stay, for it to reuse.
  clearParams: () => void;
}

export const createChatbotParamsActions = (
  set: (fn: (state: ChatbotParamsState) => Partial<ChatbotParamsState>) => void
): ChatbotParamsActions => ({
  setParams: (params) => set(() => ({ params })),
  setSavedParams: (savedParams) => set(() => ({ savedParams })),
  clearParams: () => set(() => ({ params: null })),
});
