import { Request, Response, NextFunction } from 'express';
import { IUser } from '@repo/shared-types';
import { verifyToken } from 'src/auth/verify_token';
import { userExists } from 'src/services/users';

export interface AuthenticatedRequest extends Request {
    authUser?: IUser;
}

// Reuses the same IAM round-trip the websocket upgrade already does
// (verifyToken -> userExists) — this is the only auth mechanism realtime has,
// there's no Keycloak-JWT verification here like IAM's GetKeycloakUser.
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization;
    if (!token) {
        res.status(401).send({ isError: true, message: 'Token não fornecido' });
        return;
    }

    try {
        const tokenUser = await verifyToken(req.traceId, token);
        req.authUser = await userExists(req.traceId, tokenUser.email, token);
        next();
    } catch {
        res.status(401).send({ isError: true, message: 'Token inválido' });
    }
};
