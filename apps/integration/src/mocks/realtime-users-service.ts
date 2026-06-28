import { IOnlineUser, IUser } from '@repo/shared-types';

// Replaced by jest.fn() in tests via jest.mock('src/services/users').
// This file is the moduleNameMapper target so TypeScript sees the right shape.
export const addToIam = (_user: IOnlineUser): void => {};
export const removeFromIam = (_userId: string): void => {};
export const userExists = (_email: string, _token: string): Promise<IUser> => Promise.resolve({} as IUser);
export const findUserBySlug = (_slug: string): Promise<IUser> => Promise.resolve({} as IUser);
