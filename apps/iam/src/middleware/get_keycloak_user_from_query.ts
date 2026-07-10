import { type Request, type Response, type NextFunction } from 'express';
import logger from '#logger';
import { defaultValidateToken } from './get_keycloak_user';

// EventSource can't send custom headers, so the SSE stream route can't use
// GetKeycloakUser's Authorization-header check — the token travels as a
// query param instead. Same validation (defaultValidateToken), same
// req.userKc shape, so GetUser still works unchanged after this.
export const GetKeycloakUserFromQuery = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = typeof req.query.token === 'string' ? req.query.token : '';
        const result = await defaultValidateToken(token);

        req.userKc = {
            id: result.sub!,
            email: result?.email,
            firstName: result?.given_name,
            lastName: result?.family_name,
        };

        return next();
    } catch (error) {
        logger.warn(error, 'GetKeycloakUserFromQuery: Não autorizado');
        return res.status(403).send({ isError: true, data: {}, message: 'Não autorizado', status: 401 });
    }
};
