import z from 'zod';
import { validateParse, ValidateParseResult } from '#utils/zod/validate_parse';
import { OnlineUserUtils } from '#schemas/online_user/utils';
import { IOnlineUserController } from 'src/controllers/online_user/params';

type IInput = IOnlineUserController['IAdd']['IInput'];
type IOutput = IOnlineUserController['IAdd']['IOutput'];

const utils = new OnlineUserUtils();

export const inputSchema = utils.zodSchema;

export const validateInput = (params: IInput): ValidateParseResult => {
    return validateParse<IInput>(inputSchema, params);
};

export const outputSchema = utils.zodSchema;

export const validateOutput = (params: IOutput): ValidateParseResult => {
    return validateParse<IOutput>(outputSchema, params);
};
