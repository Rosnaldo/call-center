import { type Application } from 'express';
import { UserRole } from '@repo/shared-types';

import { TransactionController } from '#controllers/transaction';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';
import { GetUser } from '#middleware/get_user';
import { authorizeMiddleware } from '#middleware/authorize';

export default (app: Application) => {
    app.post(
        '/transactions/create',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new TransactionController();
            const mapped = controller.create.mapper(req.body);
            const either = await controller.create.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.get(
        '/transactions/list',
        GetKeycloakUser,
        GetUser,
        authorizeMiddleware([UserRole.admin, UserRole.customer]),
        async (req, res) => {
            const controller = new TransactionController();
            const query = req.user.role === UserRole.customer
                ? { ...req.query, userId: req.user._id.toString() }
                : req.query;
            const params = controller.list.mapper(query);
            const either = await controller.list.get({ params });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
};
