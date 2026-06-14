import z from 'zod';
import { makeSmallStringSchema, makeStringSchema } from '#utils/zod/valid_small_string';

export class OnlineUserUtils {
    public readonly zodSchema = z.object({
        id: makeSmallStringSchema('id'),
        name: makeSmallStringSchema('name'),
        avatarUrl: makeStringSchema('avatarUrl').optional(),
        status: z.enum(['idle', 'waiting', 'in-call']),
        isOnline: z.boolean().optional(),
    });
}
