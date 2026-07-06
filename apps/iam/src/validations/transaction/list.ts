import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeObjectIdSchema } from '#utils/zod/valid_objectid_schema';
import { makeEnumSchema } from '#utils/zod/valid_enum';
import { ITransactionController } from 'src/controllers/transaction/params';

type IInput = ITransactionController['IList']['IInput'];

export const inputSchema = z.object({
    userId: makeObjectIdSchema('userId'),
    page: z.number().int('page deve ser um numero inteiro').min(1, 'page deve ser maior ou igual a 1'),
    limit: z.number().int('limit deve ser um numero inteiro').min(1, 'limit deve ser maior ou igual a 1').max(100, 'limit não deve ultrapassar 100'),
    search: z.string().trim().max(150, 'search não deve ultrapassar 150 caracteres').optional(),
    type: makeEnumSchema(['charge', 'reload'], 'type').optional(),
});

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};
