import { AppSearchResult, ChatbotChoice, ChatbotMessage, ChatbotMessageAction, ChatbotState, initialAppSearch, initialChatbotState } from './state.ts';

export interface ChatbotActions {
  addMessage: (message: ChatbotMessage) => void;
  setBotTyping: (isBotTyping: boolean) => void;
  requestAllowedApps: () => void;
  requestChoice: (choices: ChatbotChoice[]) => void;
  fulfillChoiceRequest: () => void;
  offerRestart: () => void;
  fulfillAllowedAppsRequest: () => void;
  openAllowedAppsModal: () => void;
  closeAllowedAppsModal: () => void;
  startAppSearch: (term: string) => void;
  setAppSearchResults: (result: { term: string; apps: AppSearchResult[]; failed: boolean }) => void;
  clearAppSearch: () => void;
  resetChatbot: () => void;
}

// Puts the action's button on the latest bot message, taking any button off
// the earlier ones so there's a single one.
const withActionOnLastBotMessage = (
  messages: ChatbotMessage[],
  action: ChatbotMessageAction,
  choices?: ChatbotChoice[],
): ChatbotMessage[] => {
  let target = messages.length - 1;
  while (target >= 0 && messages[target].autor !== 'bot') target -= 1;
  return messages.map((m, i) => {
    const { action: _action, choices: _choices, ...rest } = m;
    if (i === target) return choices ? { ...rest, action, choices } : { ...rest, action };
    return m.action ? rest : m;
  });
};

export const createChatbotActions = (
  set: (fn: (state: ChatbotState) => Partial<ChatbotState>) => void
): ChatbotActions => {
  return {
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setBotTyping: (isBotTyping) => set(() => ({ isBotTyping })),
    // The button goes on the bot message asking for the list.
    requestAllowedApps: () =>
      set((state) => ({
        messages: withActionOnLastBotMessage(state.messages, 'select_allowed_apps'),
        isAllowedAppsRequested: true,
      })),
    // The buttons go on the bot's question.
    requestChoice: (choices) =>
      set((state) => ({
        messages: withActionOnLastBotMessage(state.messages, 'choice', choices),
        isChoiceRequested: true,
      })),
    fulfillChoiceRequest: () => set(() => ({ isChoiceRequested: false })),
    // The button goes on the bot's final message (the summary).
    offerRestart: () =>
      set((state) => ({
        messages: withActionOnLastBotMessage(state.messages, 'restart'),
        isRestartOffered: true,
      })),
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
