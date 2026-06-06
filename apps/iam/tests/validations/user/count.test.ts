import { Expect, Equal } from 'src/types';
import { IUserController } from 'src/controllers/user/params';
import { outputSchema } from 'src/validations/user/count';
import z from 'zod';

describe('Validations > User > Count', () => {
    it('validate output type', () => {
        type IOutput = z.infer<typeof outputSchema>;
        type _t = Expect<Equal<IUserController['ICount']['IOutput'], IOutput>>;
    });
});
