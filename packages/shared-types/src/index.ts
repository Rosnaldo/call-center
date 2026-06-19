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

export interface ICall {
    _id: string;
    customerId: string;
    customerName: string;
    attendantId: string;
    attendantName: string;
    roomName: string;
    sessionId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CallState {
    id: string;
    customerId: string;
    customerName: string;
    attendantId: string;
    attendantName: string;
    roomName: string;
    sessionId: string;
    status: 'active' | 'completed' | 'awaiting-answer' | 'call-interrupteded';
    wasAnswered: boolean;
    startedAt?: number;
    tokensCharged?: number;
    interruptedAt?: number;
}

export type PresenceEventType =
    | 'JOINED'
    | 'LEFT';

export interface ICallUserPresenceEvent {
    _id: string;
    roomName: string;
    sessionId: string;
    userId: string;

    type: PresenceEventType;
    occurredAt: Date;

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

export interface IOnlineUser extends Omit<IUser, '_id' | 'firstName' | 'lastName' | 'avatar' | 'createdAt' | 'updatedAt'> {
    id: string;
    name: string;
    avatarUrl?: string;
    status: 'idle' | 'waiting' | 'in-call' | 'disconnecting' | 'offline';
}

type _t = [
    Expect<Equal<
        Omit<IUser, '_id' | 'firstName' | 'lastName' | 'avatar' | 'createdAt' | 'updatedAt'>,
        Pick<IOnlineUser, keyof Omit<IUser, '_id' | 'firstName' | 'lastName' | 'avatar' | 'createdAt' | 'updatedAt'>>
    >>,
    Expect<Equal<
        Omit<ICall, '_id' | 'createdAt' | 'updatedAt'>,
        Pick<CallState, keyof Omit<ICall, '_id' | 'createdAt' | 'updatedAt'>>
    >>,
];

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
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        avatarUrl: user.avatar?.url,
        status: options?.status ?? 'idle',
    };
}
