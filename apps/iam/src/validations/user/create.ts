import z from "zod";
import { validateParse, ValidateParseResult } from "#utils/zod/validate_parse";
import { IUserController } from "src/controllers/user/params";
import { UserUtils } from "src/entities/schemas/user/utils";

type IOutput = IUserController['ICreate']['IOutput'];
type IInput = IUserController['ICreate']['IInput'];

const utils = new UserUtils();

const shaped = utils.zodSchema.pick({
    firstName: true,
    lastName: true,
    role: true,
});

const partial = utils.zodSchema.pick({
    email: true,
}).partial();

export const inputSchema = z.object({
    ...shaped.shape,
    ...partial.shape,
});

export const validateInput = (params: any): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};

export const outputSchema = utils.zodSchema;

export const validateOutput = (params: IOutput): ValidateParseResult => {
    return validateParse<IOutput>(outputSchema, params);
};
