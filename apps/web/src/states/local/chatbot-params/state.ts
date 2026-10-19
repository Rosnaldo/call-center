// Days as the device owner app names them (ScheduleStore's abbreviations), Sunday first.
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// A stretch of a day in which an app may be used: "HH:MM", start before end.
export interface TimeRange {
  start: string;
  end: string;
}

// When an app may be used: per day, the ranges it's enabled in. A day left
// out blocks the app all day.
export type WeekSchedule = Partial<Record<Weekday, TimeRange[]>>;

// Per allowed app id; an app left out may be used at any time.
export type AppSchedules = Record<string, WeekSchedule>;

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
  // Absent until the chatbot asks for them (open_app_schedules).
  appSchedules?: AppSchedules | null;
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
