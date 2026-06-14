import Chance from 'chance';
import { IOnlineUser } from 'src/entities/schemas/online_user/types';

const chance = new Chance();

type IParams = {
    init?: Partial<IOnlineUser['IParams']>;
};

export const mockOnlineUser = (params: IParams = {}): IOnlineUser['IParams'] => {
    return {
        id: params.init?.id ?? chance.guid(),
        name: params.init?.name ?? `${chance.first()} ${chance.last()}`,
        avatarUrl: params.init?.avatarUrl,
        status: params.init?.status ?? 'idle',
        isOnline: params.init?.isOnline ?? true,
    };
};
