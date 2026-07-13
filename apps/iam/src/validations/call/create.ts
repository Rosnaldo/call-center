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
    activeUserIds: z.array(z.string()),
    accumulatedMs: z.number(),
    overlapStartedAt: z.number().nullable(),
    startedAt: z.coerce.date().nullable(),
    endedAt: z.coerce.date().nullable(),
    tokensToBeCharged: z.number(),
    isClosed: z.boolean(),
});

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};
