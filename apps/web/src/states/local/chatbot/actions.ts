import { AppSearchResult, ChatbotMessage, ChatbotState, initialAppSearch, initialChatbotState } from './state.ts';

export interface ChatbotActions {
  addMessage: (message: ChatbotMessage) => void;
  setBotTyping: (isBotTyping: boolean) => void;
  openAllowedAppsModal: () => void;
  closeAllowedAppsModal: () => void;
  startAppSearch: (term: string) => void;
  setAppSearchResults: (result: { term: string; apps: AppSearchResult[]; failed: boolean }) => void;
  clearAppSearch: () => void;
  resetChatbot: () => void;
}

export const createChatbotActions = (
  set: (fn: (state: ChatbotState) => Partial<ChatbotState>) => void
): ChatbotActions => {
  return {
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setBotTyping: (isBotTyping) => set(() => ({ isBotTyping })),
    openAllowedAppsModal: () => set(() => ({ isAllowedAppsModalOpen: true, appSearch: initialAppSearch })),
    closeAllowedAppsModal: () => set(() => ({ isAllowedAppsModalOpen: false, appSearch: initialAppSearch })),
    // Keeps the previous results on screen until the new ones arrive.
    startAppSearch: (term) => set((state) => ({ appSearch: { ...state.appSearch, term, status: 'loading' } })),
    setAppSearchResults: ({ term, apps, failed }) =>
      set((state) =>
        state.appSearch.term === term
          ? { appSearch: { term, results: apps, status: failed ? 'error' : 'done' } }
          : {}
      ),
    clearAppSearch: () => set(() => ({ appSearch: initialAppSearch })),
    resetChatbot: () => set(() => ({ ...initialChatbotState })),
  };
};
