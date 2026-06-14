import z from 'zod';
import { Expect, Equal } from 'src/types';
import { inputSchema, outputSchema } from 'src/validations/online_user/add';
import { IOnlineUserController } from 'src/controllers/online_user/params';

describe('Validations > OnlineUser > Add', () => {
    it('validate input type', () => {
        type IInput = z.infer<typeof inputSchema>;
        type _t = Expect<Equal<IOnlineUserController['IAdd']['IInput'], IInput>>;
    });

    it('validate output type', () => {
        type IOutput = z.infer<typeof outputSchema>;
        type _t = Expect<Equal<IOnlineUserController['IAdd']['IOutput'], IOutput>>;
    });

    it('accepts valid input', () => {
        const result = inputSchema.safeParse({
            id: 'user-1',
            name: 'João Silva',
            status: 'idle',
            isOnline: true,
        });
        expect(result.success).toBe(true);
    });

    it('accepts input with optional avatarUrl', () => {
        const result = inputSchema.safeParse({
            id: 'user-1',
            name: 'João Silva',
            status: 'waiting',
            avatarUrl: 'https://cdn.example.com/avatar.png',
        });
        expect(result.success).toBe(true);
    });

    it('rejects input without id', () => {
        const result = inputSchema.safeParse({ name: 'João Silva', status: 'idle' });
        expect(result.success).toBe(false);
    });

    it('rejects invalid status', () => {
        const result = inputSchema.safeParse({ id: '1', name: 'João', status: 'offline' });
        expect(result.success).toBe(false);
    });

    it('accepts all valid statuses', () => {
        for (const status of ['idle', 'waiting', 'in-call'] as const) {
            const result = inputSchema.safeParse({ id: '1', name: 'João', status });
            expect(result.success).toBe(true);
        }
    });
});
