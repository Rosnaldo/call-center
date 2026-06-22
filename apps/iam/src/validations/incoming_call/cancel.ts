import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';

export const inputSchema = z.object({
    customerId: makeSmallStringSchema('customerId'),
    attendantId: makeSmallStringSchema('attendantId'),
});

export type ICancelInput = z.infer<typeof inputSchema>;

export const validateInput = (params: ICancelInput): ValidateParseResult => {
    return validateParse<ICancelInput>(inputSchema, params);
};
