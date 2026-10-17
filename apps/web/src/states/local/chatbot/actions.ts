import { AppSearchResult, BotActivity, ChatbotChoice, ChatbotMessage, ChatbotMessageAction, ChatbotParams, ChatbotState, initialAppSearch, initialChatbotState } from './state.ts';
import { saveParams } from '../../../components/chatbot-hero/saved-params.ts';

export interface ChatbotActions {
  addMessage: (message: ChatbotMessage) => void;
  // `activity` says what the indicator shows while typing.
  setBotTyping: (isBotTyping: boolean, activity?: BotActivity) => void;
  requestAllowedApps: () => void;
  requestBlockedTerms: () => void;
  requestChoice: (choices: ChatbotChoice[]) => void;
  fulfillChoiceRequest: () => void;
  offerRestart: () => void;
  offerInstallerDownload: (url: string) => void;
  fulfillAllowedAppsRequest: () => void;
  openAllowedAppsModal: () => void;
  closeAllowedAppsModal: () => void;
  fulfillBlockedTermsRequest: () => void;
  openBlockedTermsModal: () => void;
  closeBlockedTermsModal: () => void;
  startAppSearch: (term: string) => void;
  setAppSearchResults: (result: { term: string; apps: AppSearchResult[]; failed: boolean }) => void;
  clearAppSearch: () => void;
  setSendEnabled: (isSendEnabled: boolean) => void;
  setParams: (params: ChatbotParams) => void;
  // Keeps the finished conversation's params, in the store and localStorage.
  setSavedParams: (params: ChatbotParams) => void;
  // `params` shows other params than the conversation's.
  openSummaryModal: (params?: ChatbotParams) => void;
  closeSummaryModal: () => void;
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
    setBotTyping: (isBotTyping, activity = 'processing') =>
      set(() => (isBotTyping ? { isBotTyping, botActivity: activity } : { isBotTyping })),
    // The button goes on the bot message asking for the list.
    requestAllowedApps: () =>
      set((state) => ({
        messages: withActionOnLastBotMessage(state.messages, 'select_allowed_apps'),
        isAllowedAppsRequested: true,
      })),
    requestBlockedTerms: () =>
      set((state) => ({
        messages: withActionOnLastBotMessage(state.messages, 'add_blocked_terms'),
        isBlockedTermsRequested: true,
      })),
    // The buttons go on the bot's question.
    requestChoice: (choices) =>
      set((state) => ({
        messages: withActionOnLastBotMessage(state.messages, 'choice', choices),
        isChoiceRequested: true,
      })),
    fulfillChoiceRequest: () => set(() => ({ isChoiceRequested: false })),
    // The download button goes on the bot's "installer ready" message (the
    // last one), without touching the restart buttons on the summary above.
    offerInstallerDownload: (url) =>
      set((state) => {
        let target = state.messages.length - 1;
        while (target >= 0 && state.messages[target].autor !== 'bot') target -= 1;
        return {
          messages: state.messages.map((m, i) =>
            i === target ? { ...m, action: 'download_installer', installerUrl: url } : m
          ),
        };
      }),
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
    fulfillBlockedTermsRequest: () =>
      set(() => ({ isBlockedTermsRequested: false, isBlockedTermsModalOpen: false })),
    openBlockedTermsModal: () => set(() => ({ isBlockedTermsModalOpen: true })),
    closeBlockedTermsModal: () => set(() => ({ isBlockedTermsModalOpen: false })),
    // Keeps the previous results on screen until the new ones arrive.
    startAppSearch: (term) => set((state) => ({ appSearch: { ...state.appSearch, term, status: 'loading' } })),
    setAppSearchResults: ({ term, apps, failed }) =>
      set((state) =>
        state.appSearch.term === term
          ? {
              appSearch: { term, results: apps, status: failed ? 'error' : 'done' },
              searchedApps: { ...state.searchedApps, ...Object.fromEntries(apps.map((app) => [app.id, app])) },
            }
          : {}
      ),
    clearAppSearch: () => set(() => ({ appSearch: initialAppSearch })),
    setSendEnabled: (isSendEnabled) => set(() => ({ isSendEnabled })),
    setParams: (params) => set(() => ({ params })),
    setSavedParams: (savedParams) => {
      saveParams(savedParams);
      set(() => ({ savedParams }));
    },
    openSummaryModal: (params) => set(() => ({ isSummaryModalOpen: true, summaryParams: params ?? null })),
    closeSummaryModal: () => set(() => ({ isSummaryModalOpen: false, summaryParams: null })),
    // A new conversation; the kept params stay, for it to reuse.
    resetChatbot: () => set((state) => ({ ...initialChatbotState, savedParams: state.savedParams })),
  };
};
