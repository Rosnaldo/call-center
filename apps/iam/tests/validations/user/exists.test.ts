import z from 'zod';
import { Expect, Equal } from 'src/types';
import { outputSchema, inputSchema } from 'src/validations/user/exists';
import { IUserController } from 'src/controllers/user/params';

describe('Validations > User > Exists', () => {
    it('validate output type', () => {
        type IOutput = z.infer<typeof outputSchema>;
        type _t = Expect<Equal<IUserController['IExists']['IOutput'], IOutput>>;
    });

    it('validate input type', () => {
        type IInput = z.infer<typeof inputSchema>;
        type _t = Expect<Equal<IUserController['IExists']['IInput'], IInput>>;
    });
});
