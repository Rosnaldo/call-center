import { IOnlineUser } from '@repo/shared-types';

// Replaced by jest.fn() in tests via jest.mock('src/services/users').
// This file is the moduleNameMapper target so TypeScript sees the right shape.
export const addToIam = (_user: IOnlineUser, _token: string): void => {};
export const removeFromIam = (_userId: string, _token: string): void => {};
