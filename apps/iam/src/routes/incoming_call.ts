import { type Application } from 'express';
import { IncomingCallController } from '#controllers/incoming_call';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.post(
        '/incoming-calls/send',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new IncomingCallController();
            const mapped = controller.send.mapper(req.body);
            const either = await controller.send.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.post(
        '/incoming-calls/accept',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new IncomingCallController();
            const mapped = controller.accept.mapper(req.body);
            const either = await controller.accept.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.post(
        '/incoming-calls/cancel',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new IncomingCallController();
            const mapped = controller.cancel.mapper(req.body);
            const either = await controller.cancel.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send();
        }
    );
};
