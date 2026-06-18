import { type Application } from 'express';
import { CallController } from '#controllers/call';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.post(
        '/calls/create',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.create.mapper(req.body);
            const either = await controller.create.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(201).send(either.data);
        }
    );
};
