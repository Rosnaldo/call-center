import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { ICallUserPresenceController } from 'src/controllers/call_user_presence/params';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';
import { makeDateSchema } from '#utils/zod/valid_date';
import { makeObjectIdSchema } from 'src/utils/zod/valid_objectid_schema';
import { makeEnumSchema } from 'src/utils/zod/valid_enum';
import { CallUserPresenceUtils } from 'src/entities/schemas/call_user_presence/utils';
import { PresenceEventType } from '@repo/shared-types';

type IOutput = ICallUserPresenceController['ICreate']['IOutput'];
type IInput = ICallUserPresenceController['ICreate']['IInput'];

const presenceEventTypes: PresenceEventType[] = ['JOINED', 'LEFT'];

export const inputSchema = z.object({
    roomName: makeSmallStringSchema('roomName'),
    sessionId: makeObjectIdSchema('sessionId'),
    userId: makeObjectIdSchema('userId'),
    type: makeEnumSchema(presenceEventTypes, 'type'),
    occurredAt: makeDateSchema('occurredAt'),
});

export const validateInput = (params: any): ValidateParseResult =>
    validateParse<IInput>(inputSchema, params);

const utils = new CallUserPresenceUtils();
export const outputSchema = utils.zodSchema;

export const validateOutput = (params: IOutput): ValidateParseResult =>
    validateParse<IOutput>(outputSchema, params);
