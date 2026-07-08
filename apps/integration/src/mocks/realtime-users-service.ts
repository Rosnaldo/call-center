import { IOnlineUser, IUser } from '@repo/shared-types';

// Replaced by jest.fn() in tests via jest.mock('src/services/users').
// This file is the moduleNameMapper target so TypeScript sees the right shape.
export const addToIam = (_user: IOnlineUser): Promise<void> => Promise.resolve();
export const removeFromIam = (_userId: string): Promise<void> => Promise.resolve();
export const userExists = (_email: string, _token: string): Promise<IUser> => Promise.resolve({} as IUser);
export const findUserBySlug = (_slug: string): Promise<IUser> => Promise.resolve({} as IUser);
export const touchOnlineUser = (_userId: string): Promise<boolean> => Promise.resolve(true);
export const updateOnlineUserStatus = (_traceId: string, _userId: string, _status: IOnlineUser['status']): Promise<void> => Promise.resolve();
