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

export interface IncomingCallState {
    customerId: string;
    attendantId: string;
    calledBy: keyof typeof UserRole;
}

export interface CallState {
    id: string;
    customerId: string;
    customerName: string;
    attendantId: string;
    attendantName: string;
    roomName: string;
    meetingId: string;
    activeUserIds: string[];
    accumulatedMs: number;
    overlapStartedAt: number | null;
    startedAt: Date | null;
    endedAt: Date | null;
    isPlaying: boolean;
    tokensToBeCharged: number;
}

export interface Message {
  id: string;
  sender: 'attendant' | 'customer';
  text?: string;
  timestamp: string;
  file?: {
    name: string;
    size: string;
    type: string;
    url: string;
  };
}

export interface TokenTransaction {
  id: string;
  message: string;
  date: string;
  type: 'charge' | 'reload';
  amount: number;
}

export interface ChatAttendantment {
  id: string;
  attendatId: string;
  customerId: string;
  messages: Message[];
}

export function getCallElapsedMs(call: Pick<CallState, 'accumulatedMs' | 'overlapStartedAt'>): number {
    if (call.overlapStartedAt) {
        return call.accumulatedMs + (Date.now() - call.overlapStartedAt);
    }
    return call.accumulatedMs;
}

// 1 token per commenced 10-minute block of "both users present" call time.
export const BILLING_INTERVAL_MS = 10 * 60 * 1000;

export function computeTokensToBeCharged(elapsedMs: number): number {
    if (elapsedMs <= 0) return 0;
    return Math.ceil(elapsedMs / BILLING_INTERVAL_MS);
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
    status: 'idle' | 'occupied' | 'in-call' | 'disconnecting' | 'offline';
}

type _t = [
    Expect<Equal<
        Omit<IUser, '_id' | 'firstName' | 'lastName' | 'avatar' | 'createdAt' | 'updatedAt'>,
        Pick<IOnlineUser, keyof Omit<IUser, '_id' | 'firstName' | 'lastName' | 'avatar' | 'createdAt' | 'updatedAt'>>
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
