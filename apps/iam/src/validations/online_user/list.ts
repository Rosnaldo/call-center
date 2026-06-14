import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { OnlineUserUtils } from '#schemas/online_user/utils';
import { IOnlineUserController } from 'src/controllers/online_user/params';

type IOutput = IOnlineUserController['IList']['IOutput'];

const utils = new OnlineUserUtils();

export const outputSchema = z.object({
    users: z.array(utils.zodSchema),
});

export const validateOutput = (params: IOutput): ValidateParseResult => {
    return validateParse<IOutput>(outputSchema, params);
};
