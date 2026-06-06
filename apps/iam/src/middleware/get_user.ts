import { type Request, type Response, type NextFunction } from 'express';
import _ from 'lodash';

import { getUserDao } from '#daos/singleton';
import { UserBuilder, UserUtils } from '#schemas/user/utils';
import { UserRole } from '@repo/shared-types';

export const GetUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const email = req.userKc.email;
        const user = await getUserDao().findByEmail(email);
        if (_.isNil(user)) {
            const builder = new UserBuilder();
            const create = { firstName: req.userKc.firstName, lastName: req.userKc.lastName, email: req.userKc.email, role: UserRole.customer };
            req.user = await builder.create(create).save();
        } else {
            const utils = new UserUtils();
            req.user = utils.toObject(user);
        }
    
        return next();
    } catch (error) {
        console.log('GetUser: Não autorizado', error)
        return res.status(403).send({ isError: true, data: {}, message: 'Não autorizado', status: 401 });
    }
};
