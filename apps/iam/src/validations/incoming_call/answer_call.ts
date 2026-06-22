import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';
import { IIncomingCallController } from 'src/controllers/incoming_call/params';

type IInput = IIncomingCallController['IAnswerCall']['IInput'];

export const inputSchema = z.object({
    attendantId: makeSmallStringSchema('attendantId'),
    userId: makeSmallStringSchema('userId'),
});

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};
