import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeObjectIdSchema } from '#utils/zod/valid_objectid_schema';
import { makeStringSchema } from '#utils/zod/valid_small_string';
import { makeNumberSchema } from '#utils/zod/valid_number';
import { makeEnumSchema } from '#utils/zod/valid_enum';
import { ITransactionController } from 'src/controllers/transaction/params';

type IInput = ITransactionController['ICreate']['IInput'];

export const inputSchema = z.object({
    userId: makeObjectIdSchema('userId'),
    message: makeStringSchema('message'),
    type: makeEnumSchema(['charge', 'reload'], 'type'),
    amount: makeNumberSchema('amount').positive('amount deve ser maior que zero'),
});

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};
