export const UserRole = {
    admin: 'admin',
    customer: 'customer',
    attendant: 'attendant',
} as const;

export const UserRoleAll = [
    UserRole.admin,
    UserRole.customer,
    UserRole.attendant,
];

export interface IMedia {
    _id: string;
    url: string;
    s3Path: string;
    s3Host: string;
    cdnHost?: string;
};

export interface IUserAvatar extends IMedia {};

export interface IUser {
    _id: string;
    slug: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    avatar?: IUserAvatar;
    role: keyof typeof UserRole;
    tokens?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICallSession {
    _id: string;
    roomName: string;
    sessionId: string;
    customerId: string;
    attendantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICallUserPresence {
    _id: string;
    roomName: string;
    sessionId: string;
    userId: string;
    joinedAt: Date;
    leftAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface Pagination {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    size: number;
};

type Equal<T, U> = (<V>() => V extends T ? 1 : 2) extends (<V>() => V extends U ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

export interface IOnlineUser extends Omit<IUser, '_id' | 'firstName' | 'lastName' | 'avatar'> {
    id: string;
    name: string;
    avatarUrl?: string;
    status: 'idle' | 'waiting' | 'in-call' | 'disconnecting' | 'offline';
}

type _t = Expect<Equal<
    Omit<IUser, '_id' | 'firstName' | 'lastName' | 'avatar'>,
    Pick<IOnlineUser, keyof Omit<IUser, '_id' | 'firstName' | 'lastName' | 'avatar'>>
>>;

export function mapUserToOnlineUser(
    user: IUser,
    options?: Partial<Pick<IOnlineUser, 'status'>>,
): IOnlineUser {
    return {
        slug: user.slug,
        email: user.email,
        phone: user.phone,
        role: user.role,
        tokens: user.tokens,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        avatarUrl: user.avatar?.url,
        status: options?.status ?? 'idle',
    };
}
