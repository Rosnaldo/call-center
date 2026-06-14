import z from 'zod';
import { Expect, Equal } from 'src/types';
import { outputSchema } from 'src/validations/online_user/list';
import { IOnlineUserController } from 'src/controllers/online_user/params';

describe('Validations > OnlineUser > List', () => {
    it('validate output type', () => {
        type IOutput = z.infer<typeof outputSchema>;
        type _t = Expect<Equal<IOnlineUserController['IList']['IOutput'], IOutput>>;
    });

    it('accepts empty users list', () => {
        const result = outputSchema.safeParse({ users: [] });
        expect(result.success).toBe(true);
    });

    it('accepts list with valid users', () => {
        const result = outputSchema.safeParse({
            users: [
                { id: 'u1', name: 'Alice', status: 'idle', isOnline: true },
                { id: 'u2', name: 'Bob', status: 'in-call' },
            ],
        });
        expect(result.success).toBe(true);
    });

    it('rejects list with invalid user', () => {
        const result = outputSchema.safeParse({
            users: [{ id: 'u1', name: 'Alice', status: 'invalid' }],
        });
        expect(result.success).toBe(false);
    });
});
