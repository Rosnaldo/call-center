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

// Billing rate: 1 token per block of "both users present" call time, charged
// once each block is half elapsed — so the 1st token is due at 2.5min, the
// 2nd at 7.5min, the 3rd at 12.5min, and so on every 5min after that.
export const MINUTES_PER_TOKEN = 5;
export const BILLING_INTERVAL_MS = MINUTES_PER_TOKEN * 60 * 1000;
const HALF_BILLING_INTERVAL_MS = BILLING_INTERVAL_MS / 2;

export function computeTokensToBeCharged(elapsedMs: number): number {
    if (elapsedMs <= 0) return 0;
    return Math.floor((elapsedMs + HALF_BILLING_INTERVAL_MS) / BILLING_INTERVAL_MS);
}

// Ceiling shared by two independent safety nets: IAM's calls:* redis TTL
// (so an orphaned record can't block a pair from starting a new call) and
// Daily's own eject_after_elapsed on the meeting token (so a stuck call gets
// force-ended by Daily itself even if our own cleanup path never runs). Every
// call write (create, startedAt bump, participant join/leave, /calls/sync's
// touch) refreshes the redis TTL, so in practice a genuinely ongoing call
// never gets anywhere near this — it's a backstop for an orphaned row, not a
// real ceiling on call length.
export const MAX_CALL_DURATION_SECONDS = 60 * 60 * 2;

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
