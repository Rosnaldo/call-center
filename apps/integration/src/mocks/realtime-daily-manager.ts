// Replaced by jest.fn() in tests via jest.mock('src/webhooks/daily_manager') when needed.
// This file is the moduleNameMapper target so TypeScript sees the right shape.
export const deleteDailyRoom = (_room: string): Promise<void> => Promise.resolve();
export const ejectBothParticipantsFromRoom = (_room: string, _userIds: string[]): Promise<void> => Promise.resolve();
export const registerDailyWebhooks = (): Promise<void> => Promise.resolve();
export const cleanupDailyWebhooks = (): Promise<void> => Promise.resolve();
