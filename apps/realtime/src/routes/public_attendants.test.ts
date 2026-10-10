import { describe, expect, it, vi } from 'vitest';
import type { IOnlineUser } from '@repo/shared-types';
import { toPublicAttendants } from './public_attendants';

vi.mock('#logger', () => ({ default: { error: vi.fn(), info: vi.fn() } }));
vi.mock('../redis/singleton', () => ({ getRedisClient: vi.fn() }));
vi.mock('../services/online_users_redis', () => ({ getOnlineUsersList: vi.fn() }));


const user = (over: Partial<IOnlineUser>): IOnlineUser =>
    ({
        id: 'u1',
        name: 'Ana Lima',
        avatarUrl: 'https://example.test/a.png',
        role: 'attendant',
        status: 'idle',
        email: 'ana@example.test',
        phone: '+5511999999999',
        slug: 'ana',
        tokens: 10,
        ...over,
    }) as IOnlineUser;

describe('toPublicAttendants', () => {
    it('keeps attendants and admins only', () => {
        const users = [user({ id: 'a' }), user({ id: 'b', role: 'admin' }), user({ id: 'c', role: 'customer' })];
        expect(toPublicAttendants(users).map((u) => u.id)).toEqual(['a', 'b']);
    });

    it('drops every private field', () => {
        expect(toPublicAttendants([user({})])).toEqual([
            { id: 'u1', name: 'Ana Lima', avatarUrl: 'https://example.test/a.png', role: 'attendant', status: 'idle' },
        ]);
    });
});
