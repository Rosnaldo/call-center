import { UnauthorizedRequestException } from '#exceptions/unauthorized_request';
import { BadRequestException } from '#exceptions/bad_request';
import { IsError } from './either';
import { safeObjectify } from './safe_objectify';
import logger from '#logger';

export const logError = (error: unknown, endpoint: string): IsError => {
    if (error instanceof BadRequestException) {
        logger.warn({ endpoint }, `BadRequestException: ${error.message}`);
        return { isError: true, status: 400, message: error.message };
    }

    if (error instanceof UnauthorizedRequestException) {
        logger.warn({ endpoint }, `UnauthorizedRequestException: ${error.message}`);
        return { isError: true, status: 403, message: error.message };
    }

    logger.error({ err: safeObjectify(error) }, 'iam unexpected error');
    return { isError: true, status: 500, message: 'iam unexpected error' }
};
