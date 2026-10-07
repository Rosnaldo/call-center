// A button shown under a bot message.
export type ChatbotMessageAction = 'select_allowed_apps';

export interface ChatbotMessage {
  autor: string;
  message: string;
  action?: ChatbotMessageAction;
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
  // Set by the bot's `open_allowed_apps` ws event until the list is sent; the
  // bot message asking for it shows a button that opens the modal.
  isAllowedAppsRequested: boolean;
  isAllowedAppsModalOpen: boolean;
  appSearch: AppSearchState;
}

export const initialAppSearch: AppSearchState = { term: '', results: [], status: 'idle' };

export const initialChatbotState: ChatbotState = {
  messages: [],
  isBotTyping: false,
  isAllowedAppsRequested: false,
  isAllowedAppsModalOpen: false,
  appSearch: initialAppSearch,
};
