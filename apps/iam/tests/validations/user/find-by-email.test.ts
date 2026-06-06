import z from 'zod';
import { Expect, Equal } from 'src/types';
import { outputSchema, inputSchema } from 'src/validations/user/find-by-email';
import { IUserController } from 'src/controllers/user/params';

describe('Validations > User > FindByEmail', () => {
    it('validate output type', () => {
        type IOutput = z.infer<typeof outputSchema>;
        type _t = Expect<Equal<IUserController['IByEmail']['IOutput'], IOutput>>;
    });

    it('validate input type', () => {
        type IInput = z.infer<typeof inputSchema>;
        type _t = Expect<Equal<IUserController['IByEmail']['IInput'], IInput>>;
    });
});
