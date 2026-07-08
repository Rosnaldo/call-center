import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';

export const inputSchema = z.object({
    id: makeSmallStringSchema('id'),
    status: z.enum(['idle', 'occupied', 'in-call', 'disconnecting', 'offline']),
});

export type IUpdateStatusInput = z.infer<typeof inputSchema>;

export const validateInput = (params: IUpdateStatusInput): ValidateParseResult => {
    return validateParse<IUpdateStatusInput>(inputSchema, params);
};
