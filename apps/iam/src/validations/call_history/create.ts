import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';
import { ICallHistoryController } from 'src/controllers/call_history/params';

type IInput = ICallHistoryController['ICreate']['IInput'];

export const inputSchema = z.object({
    callId: makeSmallStringSchema('callId'),
    customerId: makeSmallStringSchema('customerId'),
    customerName: makeSmallStringSchema('customerName'),
    attendantId: makeSmallStringSchema('attendantId'),
    attendantName: makeSmallStringSchema('attendantName'),
    roomName: makeSmallStringSchema('roomName'),
    meetingId: makeSmallStringSchema('meetingId').or(z.literal('')),
    accumulatedMs: z.number(),
    startedAt: z.coerce.date().nullable(),
    endedAt: z.coerce.date().nullable(),
    tokensToBeCharged: z.number(),
});

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};
