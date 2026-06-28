import { type Request, type Response, type NextFunction } from 'express';
import { UserRole } from '@repo/shared-types';
import logger from '#logger';

import { UserCrud } from '#crud/user';
import { UserBuilder } from '#schemas/user/utils';

export const GetUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, firstName, lastName } = req.userKc;
        const crud = new UserCrud();
        let user = await crud.findByEmail(email);

        if (!user) {
            const builder = new UserBuilder();
            builder.create({ firstName, lastName, email, role: UserRole.customer });
            user = await builder.save();
        }

        req.user = user;

        return next();
    } catch (error) {
        logger.warn(error, 'GetUser: Não autorizado')
        return res.status(403).send({ isError: true, data: {}, message: 'Não autorizado', status: 401 });
    }
};
