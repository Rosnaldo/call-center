import z from 'zod';

export const makeEnumSchema = <T extends string>(array: T[], field: string) => z.enum(array, `${field} inválido`);
