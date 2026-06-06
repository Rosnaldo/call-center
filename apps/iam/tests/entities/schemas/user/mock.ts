import Chance from 'chance';

import { UserBuilder } from 'src/entities/schemas/user/utils';
import { IUser } from 'src/entities/schemas/user/types';
import { UserRole } from '@repo/shared-types';

const chance = new Chance();

type IParams = {
    init?: Partial<IUser['IParams']>;
};

export const mockUser = (params: IParams = {}): UserBuilder => {
    const builder = new UserBuilder();

    builder.create({
        firstName: params.init?.firstName ?? chance.first(),
        lastName: params.init?.lastName ?? chance.last(),
        email: params.init?.email ?? chance.email(),
        role: params.init?.role ?? UserRole.customer,
    });

    return builder;
};
