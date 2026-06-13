import { z, ZodOptional, ZodString } from 'zod';
import mongoose from 'mongoose';

export const makeObjectIdSchema = (entity: string): ZodString =>
    z.string({ error: `${entity} não pode ser nulo` }).refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: `${entity} ObjectId inválido`
    });

export const makeObjectIdOptionalSchema = (entity: string): ZodOptional<ZodString> =>
    z
        .string({ error: `${entity} não pode ser nulo` })
        .optional()
        .refine((val) => mongoose.Types.ObjectId.isValid(val!), {
            message: `${entity} ObjectId inválido`
        });
