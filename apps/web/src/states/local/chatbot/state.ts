import type { ChatbotParams } from '../chatbot-params/state.ts';

// A button shown under a bot message.
export type ChatbotMessageAction =
  | 'select_allowed_apps'
  | 'add_blocked_terms'
  | 'set_app_schedules'
  | 'choice'
  | 'restart'
  | 'download_installer';

// A text from the bot: an i18n key under `chatbot.` and its params.
export interface BotText {
  key: string;
  params?: Record<string, unknown>;
}

// A button's text and what it answers (sent as the user's message). `key`
// (under `chatbot.`) translates it again when the language changes.
export interface ChatbotChoice {
  label: string;
  value: string;
  key?: string;
}

export interface ChatbotMessage {
  autor: string;
  // As translated on arrival; shown when there's no `text` (typed by the user).
  message: string;
  // Translated on render, so the message follows the selected language.
  text?: BotText;
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

export interface AppSearchState {
  // Normalized term of the latest search sent; results for other terms are stale.
  term: string;
  results: AppSearchResult[];
  status: 'idle' | 'loading' | 'done' | 'error';
}

// What the bot is busy with while isBotTyping: creating the installer, or
// any other reply (including the LLM reading a free-text answer).
export type BotActivity = 'processing' | 'generating';

export interface ChatbotState {
  messages: ChatbotMessage[];
  isBotTyping: boolean;
  botActivity: BotActivity;
  // Set by the bot's `open_allowed_apps` ws event until the list is sent; the
  // bot message asking for it shows a button that opens the modal.
  isAllowedAppsRequested: boolean;
  isAllowedAppsModalOpen: boolean;
  // Set by the bot's `open_blocked_terms` event until the words are sent; the
  // bot message asking for them shows a button that opens the modal.
  isBlockedTermsRequested: boolean;
  isBlockedTermsModalOpen: boolean;
  // Set by the bot's `open_app_schedules` event until the schedules are sent;
  // the bot message asking for them shows a button that opens the modal.
  isAppSchedulesRequested: boolean;
  isAppSchedulesModalOpen: boolean;
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
  isSummaryModalOpen: boolean;
  // Shown in the summary modal instead of the conversation's params (see the
  // chatbot-params store), e.g. the configuration kept from an earlier
  // conversation; null shows those.
  summaryParams: ChatbotParams | null;
  // Name and icon of the apps seen in searches, so the summary can show the
  // picked ones that aren't popular apps.
  searchedApps: Record<string, AppSearchResult>;
}

export const initialAppSearch: AppSearchState = { term: '', results: [], status: 'idle' };

export const initialChatbotState: ChatbotState = {
  messages: [],
  isBotTyping: false,
  botActivity: 'processing',
  isAllowedAppsRequested: false,
  isAllowedAppsModalOpen: false,
  isBlockedTermsRequested: false,
  isBlockedTermsModalOpen: false,
  isAppSchedulesRequested: false,
  isAppSchedulesModalOpen: false,
  isChoiceRequested: false,
  isRestartOffered: false,
  isSendEnabled: false,
  appSearch: initialAppSearch,
  isSummaryModalOpen: false,
  summaryParams: null,
  searchedApps: {},
};
