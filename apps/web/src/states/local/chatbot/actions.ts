import { AppSearchResult, ChatbotMessage, ChatbotState, initialAppSearch, initialChatbotState } from './state.ts';

export interface ChatbotActions {
  addMessage: (message: ChatbotMessage) => void;
  setBotTyping: (isBotTyping: boolean) => void;
  requestAllowedApps: () => void;
  fulfillAllowedAppsRequest: () => void;
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
    // Puts the button on the latest bot message (the one asking for the list),
    // taking it off any earlier one so there's a single button.
    requestAllowedApps: () =>
      set((state) => {
        let target = state.messages.length - 1;
        while (target >= 0 && state.messages[target].autor !== 'bot') target -= 1;
        const messages = state.messages.map((m, i) => {
          if (i === target) return { ...m, action: 'select_allowed_apps' as const };
          if (!m.action) return m;
          const { action: _action, ...rest } = m;
          return rest;
        });
        return { messages, isAllowedAppsRequested: true };
      }),
    fulfillAllowedAppsRequest: () =>
      set(() => ({ isAllowedAppsRequested: false, isAllowedAppsModalOpen: false, appSearch: initialAppSearch })),
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
