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
            slug: 'joao-silva',
            email: 'joao@example.com',
            role: 'customer',
            status: 'idle',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        expect(result.success).toBe(true);
    });

    it('accepts input with optional fields omitted', () => {
        const result = inputSchema.safeParse({
            id: 'user-1',
            name: 'João Silva',
            slug: 'joao-silva',
            role: 'attendant',
            status: 'waiting',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        expect(result.success).toBe(true);
    });

    it('accepts date strings for createdAt and updatedAt', () => {
        const result = inputSchema.safeParse({
            id: 'user-1',
            name: 'João Silva',
            slug: 'joao-silva',
            role: 'customer',
            status: 'idle',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        expect(result.success).toBe(true);
    });

    it('rejects input without id', () => {
        const result = inputSchema.safeParse({
            name: 'João Silva',
            slug: 'joao-silva',
            role: 'customer',
            status: 'idle',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        expect(result.success).toBe(false);
    });

    it('rejects invalid status', () => {
        const result = inputSchema.safeParse({
            id: '1',
            name: 'João',
            slug: 'joao',
            role: 'customer',
            status: 'unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        expect(result.success).toBe(false);
    });

    it('accepts all valid statuses', () => {
        for (const status of ['idle', 'waiting', 'in-call', 'disconnecting', 'offline'] as const) {
            const result = inputSchema.safeParse({
                id: '1',
                name: 'João',
                slug: 'joao',
                role: 'customer',
                status,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            expect(result.success).toBe(true);
        }
    });
});
