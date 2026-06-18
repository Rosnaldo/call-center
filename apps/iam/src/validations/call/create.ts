import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { ICallController } from 'src/controllers/call/params';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';
import { makeUrlSchema } from '#utils/zod/valid_url';
import { CallUtils } from 'src/entities/schemas/call/utils';
import { makeObjectIdSchema } from 'src/utils/zod/valid_objectid_schema';

type IOutput = ICallController['ICreate']['IOutput'];
type IInput = ICallController['ICreate']['IInput'];

export const inputSchema = z.object({
    customerId: makeObjectIdSchema('customerId'),
    customerName: makeSmallStringSchema('customerName'),
    attendantId: makeObjectIdSchema('attendantId'),
    attendantName: makeSmallStringSchema('attendantName'),
});

export const validateInput = (params: any): ValidateParseResult =>
    validateParse<IInput>(inputSchema, params);

const utils = new CallUtils();
export const outputSchema = utils.zodSchema;

export const validateOutput = (params: IOutput): ValidateParseResult =>
    validateParse<IOutput>(outputSchema, params);
