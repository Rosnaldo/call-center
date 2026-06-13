import { UserRole } from '@repo/shared-types';
import { type Request, type Response, type NextFunction } from 'express';

export const authorizeMiddleware = (allowList: Array<keyof typeof UserRole> = []) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { user } = req;
        if (user) {
            if (allowList.includes(user.role)) return next();
            return res.status(401).send('Sem permissão');
        }
        console.log('authorizeMiddleware: Usuario não encontrado')
        return res.status(403).send('authorizeMiddleware: Usuario não encontrado');
    };
};
