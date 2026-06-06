import { Expect, Equal } from 'src/types';
import { IUser, IAvatarParams } from 'src/entities/schemas/user/types';
import { UserUtils } from 'src/entities/schemas/user/utils';
import z from 'zod';

const utils = new UserUtils();

describe('Entities > Schema > User', () => {
    it('validate type avatar', async () => {
        type IUtils = z.infer<typeof utils.zodAvatarSchema>;
        type _t = Expect<Equal<IAvatarParams, IUtils>>
    });

    it('validate type user', async () => {
        type IUtils = z.infer<typeof utils.zodSchema>;
        type _t = Expect<Equal<IUser['IParams'], IUtils>>
    });
});
