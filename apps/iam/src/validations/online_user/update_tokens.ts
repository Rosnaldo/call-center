import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';

export const inputSchema = z.object({
    id: makeSmallStringSchema('id'),
    tokens: z.number(),
});

export type IUpdateTokensInput = z.infer<typeof inputSchema>;

export const validateInput = (params: IUpdateTokensInput): ValidateParseResult => {
    return validateParse<IUpdateTokensInput>(inputSchema, params);
};
