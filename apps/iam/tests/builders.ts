import { ICall, IOnlineUser } from '@repo/shared-types';
import { Types } from 'mongoose';

let seq = 0;
const nextId = () => `mock-${++seq}`;
const nextObjectId = () => new Types.ObjectId().toHexString();

export const buildCall = (d?: Partial<ICall>): ICall => ({
    _id: d?._id ?? nextObjectId(),
    customerId: d?.customerId ?? nextObjectId(),
    customerName: d?.customerName ?? 'Test Customer',
    attendantId: d?.attendantId ?? nextObjectId(),
    attendantName: d?.attendantName ?? 'Test Attendant',
    roomUrl: d?.roomUrl ?? 'https://meet.example.com/test-room',
    createdAt: d?.createdAt ?? new Date('2024-01-01'),
    updatedAt: d?.updatedAt ?? new Date('2024-01-01'),
});

export const buildOnlineUser = (d?: Partial<IOnlineUser>): IOnlineUser => ({
    id: d?.id ?? nextId(),
    name: d?.name ?? 'Test User',
    slug: d?.slug ?? 'test-user',
    email: d?.email ?? 'test@example.com',
    role: d?.role ?? 'customer',
    avatarUrl: d?.avatarUrl,
    status: d?.status ?? 'idle',
    tokens: d?.tokens,
    phone: d?.phone,
});
