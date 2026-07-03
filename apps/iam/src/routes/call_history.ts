import { type Application } from 'express';

import { CallHistoryController } from '#controllers/call_history';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.post(
        '/call-history/create',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallHistoryController();
            const mapped = controller.create.mapper(req.body);
            const either = await controller.create.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
};
