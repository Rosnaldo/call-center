import z from "zod";
import { validateParse, ValidateParseResult } from "#utils/zod/validate_parse";
import { UserUtils } from "#schemas/user/utils";
import { makeNumberSchema } from "src/utils/zod/valid_number";
import { IUserController } from "src/controllers/user/params";
import { makeSmallStringSchema } from "src/utils/zod/valid_small_string";
import { makeBooleanSchema } from "src/utils/zod/valid_boolean";

const utils = new UserUtils();

type IInput = IUserController['IPaginacao']['IInput'];

export const inputSchema = z.object({
  page: makeNumberSchema('page'),
  pageSize: makeNumberSchema('pageSize'),
  isPagination: z.boolean().optional(),
  search: z.string().optional(),
});

export const validateInput = (params: IInput): ValidateParseResult => {
  return validateParse<IInput>(inputSchema, params);
};

type IOutput = IUserController['IPaginacao']['IOutput'];

export const outputSchema = z.object({
  data: z.array(utils.zodSchema),
  status: makeNumberSchema('status'),
  message: makeSmallStringSchema('message'),
  isError: makeBooleanSchema('isError'),
  pagination: z.object({
    currentPage: makeNumberSchema('currentPage'),
    totalPages: makeNumberSchema('totalPages'),
    totalRecords: makeNumberSchema('totalRecords'),
    size: makeNumberSchema('size'),
  })
});

export const validateOutput = (params: IOutput): ValidateParseResult => {
  return validateParse<IOutput>(outputSchema, params);
};
