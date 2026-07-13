import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeObjectIdSchema } from 'src/utils/zod/valid_objectid_schema';
import { makeNumberSchema } from '#utils/zod/valid_number';
import { makeStringSchema } from '#utils/zod/valid_small_string';
import { IUserController } from 'src/controllers/user/params';

type IInput = IUserController['IGiveToken']['IInput'];

export const inputSchema = z.object({
    customerId: makeObjectIdSchema('customerId'),
    tokens: makeNumberSchema('tokens').positive('tokens deve ser maior que zero'),
    message: makeStringSchema('message').optional(),
});

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};
