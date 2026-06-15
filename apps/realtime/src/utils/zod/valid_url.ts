import z, { ZodString } from 'zod';

export const makeUrlSchema = (field: string): ZodString =>
    z
        .string({ error: () => `${field} e obrigatório` })
        .refine((val) => {
            try {
                new URL(val);
                return true;
            } catch {
                return false;
            }
            }, { message: "Invalid URL" })
        .trim()
