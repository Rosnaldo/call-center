import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';
import { IIncomingCallController } from 'src/controllers/incoming_call/params';

type IInput = IIncomingCallController['ISend']['IInput'];

export const inputSchema = z.object({
    customerId: makeSmallStringSchema('customerId'),
    attendantId: makeSmallStringSchema('attendantId'),
    calledBy: z.enum(['admin', 'customer', 'attendant']),
});

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};
