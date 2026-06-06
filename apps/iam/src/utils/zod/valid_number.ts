import z, { ZodNumber } from 'zod';

export const makeNumberSchema = (field: string): ZodNumber => z.number({ error: `${field} deve ser um numero` });
