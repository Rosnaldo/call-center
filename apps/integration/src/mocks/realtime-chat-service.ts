// Replaced by jest.fn() in tests via jest.mock('src/services/chat') when needed.
// This file is the moduleNameMapper target so TypeScript sees the right shape.
export const deleteChat = (_traceId: string, _customerId: string, _attendantId: string): Promise<void> => Promise.resolve();
