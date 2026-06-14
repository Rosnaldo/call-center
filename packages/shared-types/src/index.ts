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

export interface IOnlineUser {
    id: string;
    name: string;
    email: string;
    role: keyof typeof UserRole;
    avatarUrl?: string;
    status: 'idle' | 'waiting' | 'in-call' | 'disconnecting';
    isOnline?: boolean;
    tokens?: number;
}

