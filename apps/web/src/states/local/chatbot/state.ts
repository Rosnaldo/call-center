// A button shown under a bot message.
export type ChatbotMessageAction = 'select_allowed_apps' | 'choice' | 'restart' | 'download_installer';

// A button's text and what it answers (sent as the user's message).
export interface ChatbotChoice {
  label: string;
  value: string;
}

export interface ChatbotMessage {
  autor: string;
  message: string;
  action?: ChatbotMessageAction;
  // The buttons of a `choice` action.
  choices?: ChatbotChoice[];
  // The download URL of a `download_installer` action.
  installerUrl?: string;
}

// A Google Play search result, as sent by the chatbot.
export interface AppSearchResult {
  id: string;
  name: string;
  iconUrl: string;
}

// The params collected so far (null until answered), as sent by the chatbot
// with each reply.
export interface ChatbotParams {
  os: string | null;
  version: string | null;
  privateDns: boolean | null;
  privateDnsHost: string | null;
  allowedApps: string[] | null;
  installOs: string | null;
  appVersion: string | null;
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
  // Set by the bot's `ask_choice` ws event until the user answers; the bot
  // question shows a button per choice.
  isChoiceRequested: boolean;
  // Set by the bot's `offer_restart` ws event once the conversation is
  // finished; the last bot message shows a "reset" button.
  isRestartOffered: boolean;
  // Whether the send button is enabled, set by the bot with each message: only
  // on the steps answered by typing (not buttons/checklist, nor once finished).
  isSendEnabled: boolean;
  appSearch: AppSearchState;
  // Null until the chatbot sends them; shown in the summary modal.
  params: ChatbotParams | null;
  isSummaryModalOpen: boolean;
  // Name and icon of the apps seen in searches, so the summary can show the
  // picked ones that aren't popular apps.
  searchedApps: Record<string, AppSearchResult>;
}

export const initialAppSearch: AppSearchState = { term: '', results: [], status: 'idle' };

export const initialChatbotState: ChatbotState = {
  messages: [],
  isBotTyping: false,
  isAllowedAppsRequested: false,
  isAllowedAppsModalOpen: false,
  isChoiceRequested: false,
  isRestartOffered: false,
  isSendEnabled: false,
  appSearch: initialAppSearch,
  params: null,
  isSummaryModalOpen: false,
  searchedApps: {},
};
