import z from "zod";
import { validateParse, ValidateParseResult } from "#utils/zod/validate_parse";
import { IUserController } from "src/controllers/user/params";

type IOutput = IUserController['ICount']['IOutput'];

export const outputSchema = z.object({
    attendants: z.number(),
    customers: z.number(),
    admins: z.number(),
});

export const validateOutput = (params: IOutput): ValidateParseResult => {
    return validateParse<IOutput>(outputSchema, params);
};
