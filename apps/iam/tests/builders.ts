import { IOnlineUser } from '@repo/shared-types';

let seq = 0;
const nextId = () => `mock-${++seq}`;

export const buildOnlineUser = (d?: Partial<IOnlineUser>): IOnlineUser => ({
    id: d?.id ?? nextId(),
    name: d?.name ?? 'Test User',
    slug: d?.slug ?? 'test-user',
    email: d?.email ?? 'test@example.com',
    role: d?.role ?? 'customer',
    avatarUrl: d?.avatarUrl,
    status: d?.status ?? 'idle',
    isOnline: d?.isOnline ?? true,
    tokens: d?.tokens,
    phone: d?.phone,
    createdAt: d?.createdAt ?? new Date('2024-01-01'),
    updatedAt: d?.updatedAt ?? new Date('2024-01-01'),
});
