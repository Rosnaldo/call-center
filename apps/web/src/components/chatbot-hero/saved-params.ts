import type { ChatbotParams } from '../../states/local/chatbot/state.ts';

// The params of the last finished conversation, kept in the browser so the
// next one can reuse them. The chatbot validates them again before offering
// them, so whatever this holds is only a suggestion.
const STORAGE_KEY = 'chatbot.params';

// Storage can be blocked (private mode, disabled site data) or hold anything.
export const loadSavedParams = (): ChatbotParams | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as ChatbotParams) : null;
  } catch {
    return null;
  }
};

export const saveParams = (params: ChatbotParams): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // Not saved; the next conversation just asks everything again.
  }
};
