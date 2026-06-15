import z, { ZodEmail } from 'zod';

export const makeEmailSchema = (): ZodEmail => z.email({ error: 'formato do email inválido' });
