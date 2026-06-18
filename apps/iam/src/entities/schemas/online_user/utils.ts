import z from 'zod';
import { makeSmallStringSchema, makeStringSchema } from '#utils/zod/valid_small_string';

export class OnlineUserUtils {
    public readonly zodSchema = z.object({
        id: makeSmallStringSchema('id'),
        name: makeSmallStringSchema('name'),
        slug: makeSmallStringSchema('slug'),
        email: makeSmallStringSchema('email').optional(),
        phone: makeSmallStringSchema('phone').optional(),
        role: z.enum(['admin', 'customer', 'attendant']),
        avatarUrl: makeStringSchema('avatarUrl').optional(),
        status: z.enum(['idle', 'waiting', 'in-call', 'disconnecting', 'offline']),
        tokens: z.number().optional(),
    });
}
