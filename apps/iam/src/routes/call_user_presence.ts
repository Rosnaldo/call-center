import { type Application } from 'express';
import { CallUserPresenceController } from '#controllers/call_user_presence';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.post(
        '/call-user-presences/create',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallUserPresenceController();
            const mapped = controller.create.mapper(req.body);
            const either = await controller.create.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(201).send(either.data);
        }
    );
};
