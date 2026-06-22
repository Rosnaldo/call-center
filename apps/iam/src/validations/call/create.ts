import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';
import { ICallController } from 'src/controllers/call/params';

type IInput = ICallController['ICreate']['IInput'];

export const inputSchema = z.object({
    id: makeSmallStringSchema('id'),
    customerId: makeSmallStringSchema('customerId'),
    customerName: makeSmallStringSchema('customerName'),
    attendantId: makeSmallStringSchema('attendantId'),
    attendantName: makeSmallStringSchema('attendantName'),
    roomName: makeSmallStringSchema('roomName'),
    meetingId: makeSmallStringSchema('meetingId'),
    customerInCall: z.boolean(),
    attendantInCall: z.boolean(),
    wasAccepted: z.boolean(),
});

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};
