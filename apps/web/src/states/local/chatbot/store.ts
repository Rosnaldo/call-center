import { create } from 'zustand';
import { ChatbotState, initialChatbotState } from './state.ts';
import { ChatbotActions, createChatbotActions } from './actions.ts';
import { loadSavedParams } from '../../../components/chatbot-hero/saved-params.ts';

export const createChatbotStore = () => create<ChatbotState & ChatbotActions>()((set) => ({
  ...initialChatbotState,
  savedParams: loadSavedParams(),
  ...createChatbotActions(set),
}));
