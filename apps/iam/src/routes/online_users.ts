import { type Application } from 'express';
import { OnlineUserController } from '#controllers/online_user';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.post(
        '/online-users/add',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new OnlineUserController();
            const mapped = controller.add.mapper(req.body);
            const either = await controller.add.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.get(
        '/online-users/list',
        GetKeycloakUser,
        async (_req, res) => {
            const controller = new OnlineUserController();
            const either = await controller.list.get();
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.delete(
        '/online-users/remove',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new OnlineUserController();
            const mapped = controller.remove.mapper(req.body);
            const either = await controller.remove.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send();
        }
    );
};
