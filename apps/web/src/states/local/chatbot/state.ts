export interface ChatbotMessage {
  autor: string;
  message: string;
}

// A Google Play search result, as sent by the chatbot.
export interface AppSearchResult {
  id: string;
  name: string;
  iconUrl: string;
}

export interface AppSearchState {
  // Normalized term of the latest search sent; results for other terms are stale.
  term: string;
  results: AppSearchResult[];
  status: 'idle' | 'loading' | 'done' | 'error';
}

export interface ChatbotState {
  messages: ChatbotMessage[];
  isBotTyping: boolean;
  // Opened by the bot's `open_allowed_apps` ws event.
  isAllowedAppsModalOpen: boolean;
  appSearch: AppSearchState;
}

export const initialAppSearch: AppSearchState = { term: '', results: [], status: 'idle' };

export const initialChatbotState: ChatbotState = {
  messages: [],
  isBotTyping: false,
  isAllowedAppsModalOpen: false,
  appSearch: initialAppSearch,
};
