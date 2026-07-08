// Replaced by jest.fn() in tests via jest.mock('src/webhooks/daily_manager') when needed.
// This file is the moduleNameMapper target so TypeScript sees the right shape.
export const deleteDailyRoom = (_room: string): Promise<void> => Promise.resolve();
export const registerDailyWebhooks = (): Promise<void> => Promise.resolve();
export const cleanupDailyWebhooks = (): Promise<void> => Promise.resolve();

export interface DailyMeetingParticipant {
    user_id: string | null;
    participant_id: string;
    user_name: string | null;
    join_time: number;
    duration: number;
}
export const getMeetingParticipants = (_meetingId: string): Promise<DailyMeetingParticipant[]> => Promise.resolve([]);

export const isUserPresentInRoom = (_room: string, _userId: string): Promise<boolean> => Promise.resolve(false);
