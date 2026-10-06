import { create } from 'zustand';
import { ChatbotState, initialChatbotState } from './state.ts';
import { ChatbotActions, createChatbotActions } from './actions.ts';

export const createChatbotStore = () => create<ChatbotState & ChatbotActions>()((set) => ({
  ...initialChatbotState,
  ...createChatbotActions(set),
}));
