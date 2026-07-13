import { IUser } from '@repo/shared-types';

export interface User extends IUser {};

export const getFullName = (user: Pick<IUser, 'firstName' | 'lastName'>): string =>
  `${user.firstName} ${user.lastName}`;
