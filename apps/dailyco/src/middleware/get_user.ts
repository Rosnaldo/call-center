import { type Request, type Response, type NextFunction } from 'express';
import _ from 'lodash';

import { getUserDao } from '#daos/singleton';
import { UserUtils } from '#schemas/user/utils';

export const GetUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const email = req.userKc.email;
        const user = await getUserDao().findByEmail(email);
        if (_.isNil(user)) {
            throw Error('User not found')
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
