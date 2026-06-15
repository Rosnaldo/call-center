import z, { ZodString } from 'zod';

export const makePhoneSchema = (): ZodString =>
    z.string()
    .refine((val) => {
        const digits = val.startsWith("55") ? val.slice(2) : val;
        return digits.length === 10 || digits.length === 11;
    }, {
        message: `número de telefone inválido`
    });
