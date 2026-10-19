// The params the chatbot extracts from the conversation (null until
// answered), as sent with each of its replies.
export interface ChatbotParams {
  os: string | null;
  version: string | null;
  privateDns: boolean | null;
  privateDnsHost: string | null;
  allowedApps: string[] | null;
  installOs: string | null;
  appVersion: string | null;
  blockRawIp: boolean | null;
  blockedTerms: string[] | null;
}

export interface ChatbotParamsState {
  // The current conversation's, null until the chatbot sends them; shown in
  // the summary modal.
  params: ChatbotParams | null;
  // The last finished conversation's, kept in localStorage (the only field
  // persisted): the summary shows them until the conversation collects its
  // own, the forms start with them and the bot offers to reuse them.
  savedParams: ChatbotParams | null;
}

export const initialChatbotParamsState: ChatbotParamsState = {
  params: null,
  savedParams: null,
};
