import z from 'zod';
import { ICall } from './types';
import { cleanMongooseObject } from '#entities/utils/clean_mongoose_doc';
import { makeSmallStringSchema } from '#utils/zod/valid_small_string';
import { makeObjectIdSchema } from '#utils/zod/valid_objectid_schema';
import { makeDateSchema } from '#utils/zod/valid_date';


export class CallUtils {
    public readonly zodSchema = z.object({
        _id: makeObjectIdSchema('_id'),
        customerId: makeObjectIdSchema('customerId'),
        customerName: makeSmallStringSchema('customerName'),
        attendantId: makeObjectIdSchema('attendantId'),
        attendantName: makeSmallStringSchema('attendantName'),
        roomName: makeSmallStringSchema('roomName'),
        sessionId: makeSmallStringSchema('sessionId'),
        createdAt: makeDateSchema('createdAt'),
        updatedAt: makeDateSchema('updatedAt'),
    });

    public readonly toObject = (doc: ICall['IDocument']): ICall['IParams'] => {
        const object = cleanMongooseObject(doc);
        return {
            ...object,
            _id: doc?._id?.toString(),
        };
    };
}
