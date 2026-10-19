import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ChatbotParamsState, initialChatbotParamsState } from './state.ts';
import { ChatbotParamsActions, createChatbotParamsActions } from './actions.ts';

// Only the kept params go to localStorage: the conversation's are the
// chatbot's, sent again with each reply. The chatbot validates the kept ones
// before offering them, so whatever storage holds is only a suggestion.
export const createChatbotParamsStore = () => create<ChatbotParamsState & ChatbotParamsActions>()(
  persist(
    (set) => ({
      ...initialChatbotParamsState,
      ...createChatbotParamsActions(set),
    }),
    {
      name: 'chatbot.params',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ savedParams: state.savedParams }),
    },
  ),
);
