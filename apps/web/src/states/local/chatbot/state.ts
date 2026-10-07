export interface ChatbotMessage {
  autor: string;
  message: string;
}

export interface ChatbotState {
  messages: ChatbotMessage[];
  isBotTyping: boolean;
}

export const initialChatbotState: ChatbotState = {
  messages: [],
  isBotTyping: false,
};
