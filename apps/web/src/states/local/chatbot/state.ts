export interface ChatbotMessage {
  autor: string;
  message: string;
}

export interface ChatbotState {
  messages: ChatbotMessage[];
}

export const initialChatbotState: ChatbotState = {
  messages: [],
};
