import z from "zod";
import { validateParse, ValidateParseResult } from "#utils/zod/validate_parse";
import { UserUtils } from "#schemas/user/utils";
import { makeEmailSchema } from "src/utils/zod/valid_email";
import { IUserController } from "src/controllers/user/params";

const utils = new UserUtils();

type IInput = IUserController['IByEmail']['IInput'];

export const inputSchema = z.object({
  email: makeEmailSchema(),
});

export const validateInput = (params: IInput): ValidateParseResult => {
  return validateParse<IInput>(inputSchema, params);
};

type IOutput = IUserController['IByEmail']['IOutput'];

export const outputSchema = utils.zodSchema;

export const validateOutput = (params: IOutput): ValidateParseResult => {
  return validateParse<IOutput>(outputSchema, params);
};
