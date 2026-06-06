import z, { ZodDate } from 'zod';

export const makeDateSchema = (field: string): ZodDate => z.date({ error: `${field} deve ser uma data` });
