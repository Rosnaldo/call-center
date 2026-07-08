import z from "zod";
import { validateParse, ValidateParseResult } from "#utils/zod/validate_parse";
import { UserUtils } from "#schemas/user/utils";
import { makeObjectIdSchema } from "src/utils/zod/valid_objectid_schema";
import { IUserController } from "src/controllers/user/params";

const utils = new UserUtils();

type IInput = IUserController['IEdit']['IInput'];

const partialFields = utils.zodSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    role: true,
}).partial();

export const inputSchema = z.object({
    _id: makeObjectIdSchema('_id'),
    ...partialFields.shape,
});

export const validateInput = (params: any): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};

type IOutput = IUserController['IEdit']['IOutput'];

export const outputSchema = utils.zodSchema;

export const validateOutput = (params: IOutput): ValidateParseResult => {
    return validateParse<IOutput>(outputSchema, params);
};
