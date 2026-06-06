import z from 'zod';
import { Expect, Equal } from 'src/types';
import { inputSchema } from 'src/validations/user/delete';
import { IUserController } from 'src/controllers/user/params';

describe('Validations > User > Delete', () => {
    it('validate input type', () => {
        type IInput = z.infer<typeof inputSchema>;
        type _t = Expect<Equal<IUserController['IDelete']['IInput'], IInput>>;
    });
});
