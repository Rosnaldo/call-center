import z from 'zod';
import { Expect, Equal } from 'src/types';
import { outputSchema, inputSchema } from 'src/validations/user/paginacao';
import { IUserController } from 'src/controllers/user/params';

describe('Validations > User > Paginacao', () => {
    it('validate output type', () => {
        type IOutput = z.infer<typeof outputSchema>;
        type _t = Expect<Equal<IUserController['IPaginacao']['IOutput'], IOutput>>;
    });

    it('validate input type', () => {
        type IInput = z.infer<typeof inputSchema>;
        type _t = Expect<Equal<IUserController['IPaginacao']['IInput'], IInput>>;
    });
});
