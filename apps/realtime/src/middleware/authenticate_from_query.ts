import { Request, Response, NextFunction } from 'express';
import { verifyToken } from 'src/auth/verify_token';
import { userExists } from 'src/services/users';
import { AuthenticatedRequest } from './authenticate';

// Same round-trip as authenticate.ts (verifyToken -> userExists) — the only
// auth mechanism realtime has — but reads the token from a query param
// instead of the Authorization header, since EventSource can't set custom
// headers (see apps/realtime/src/routes/realtime_events.ts).
export const authenticateFromQuery = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
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
