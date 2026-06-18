import z from 'zod';
import { ICallUserPresence } from './types';
import { cleanMongooseObject } from '#entities/utils/clean_mongoose_doc';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';
import { makeObjectIdSchema } from '#utils/zod/valid_objectid_schema';
import { makeDateSchema } from '#utils/zod/valid_date';
import { makeEnumSchema } from '#utils/zod/valid_enum';
import { PresenceEventType } from '@repo/shared-types';

const presenceEventTypes: PresenceEventType[] = ['JOINED', 'LEFT'];

export class CallUserPresenceUtils {
    public readonly zodSchema = z.object({
        _id: makeObjectIdSchema('_id'),
        roomName: makeSmallStringSchema('roomName'),
        sessionId: makeObjectIdSchema('sessionId'),
        userId: makeObjectIdSchema('userId'),
        type: makeEnumSchema(presenceEventTypes, 'type'),
        occurredAt: makeDateSchema('occurredAt'),
        createdAt: makeDateSchema('createdAt'),
        updatedAt: makeDateSchema('updatedAt'),
    });

    public readonly toObject = (doc: ICallUserPresence['IDocument']): ICallUserPresence['IParams'] => {
        const object = cleanMongooseObject(doc);
        return {
            ...object,
            _id: doc?._id?.toString(),
        };
    };
}
