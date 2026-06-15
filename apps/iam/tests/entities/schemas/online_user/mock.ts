import Chance from 'chance';
import { IOnlineUser } from 'src/entities/schemas/online_user/types';

const chance = new Chance();

type IParams = {
    init?: Partial<IOnlineUser['IParams']>;
};

export const mockOnlineUser = (params: IParams = {}): IOnlineUser['IParams'] => {
    const firstName = chance.first();
    const lastName = chance.last();
    return {
        id: params.init?.id ?? chance.guid(),
        name: params.init?.name ?? `${firstName} ${lastName}`,
        slug: params.init?.slug ?? `${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        email: params.init?.email ?? `${chance.word({ length: 5 })}@test.com`,
        role: params.init?.role ?? 'customer',
        avatarUrl: params.init?.avatarUrl,
        status: params.init?.status ?? 'idle',
        isOnline: params.init?.isOnline ?? true,
        createdAt: params.init?.createdAt ?? new Date(),
        updatedAt: params.init?.updatedAt ?? new Date(),
    };
};
