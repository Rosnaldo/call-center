import { type Application } from 'express';
import { CallController } from '#controllers/call';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.get(
        '/calls/get',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const params = controller.get.mapper(req.query);
            const either = await controller.get.exec(params);
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.get(
        '/calls/get-by-room',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const params = controller.getByRoom.mapper(req.query);
            const either = await controller.getByRoom.exec(params);
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.get(
        '/calls/get-by-user',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const params = controller.getByUser.mapper(req.query);
            const either = await controller.getByUser.exec(params);
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

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
            return res.status(200).send(either.data);
        }
    );

    app.put(
        '/calls/update',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.update.mapper(req.body);
            const either = await controller.update.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.put(
        '/calls/update-participant',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.updateParticipant.mapper(req.body);
            const either = await controller.updateParticipant.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.delete(
        '/calls/delete',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.delete.mapper(req.body);
            const either = await controller.delete.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send();
        }
    );

    app.post(
        '/calls/complete',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.complete.mapper(req.body);
            const either = await controller.complete.exec({ traceId: req.traceId, mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.post(
        '/calls/track-room',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.trackRoom.mapper(req.body);
            const either = await controller.trackRoom.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.delete(
        '/calls/rooms',
        GetKeycloakUser,
        async (_req, res) => {
            const controller = new CallController();
            const either = await controller.deleteRooms.exec();
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
};
