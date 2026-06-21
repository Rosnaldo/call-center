import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';

export const inputSchema = z.object({
    id: makeSmallStringSchema('id'),
});

export type IDeleteInput = z.infer<typeof inputSchema>;

export const validateInput = (params: IDeleteInput): ValidateParseResult => {
    return validateParse<IDeleteInput>(inputSchema, params);
};
