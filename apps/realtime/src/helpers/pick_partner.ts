import { IUser } from '@repo/shared-types';

export function pickPartner(customer: IUser, attendant: IUser, user: IUser): IUser {
    return user._id === customer._id ? attendant : customer;
}
