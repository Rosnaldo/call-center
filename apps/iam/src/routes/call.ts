import { type Application } from 'express';
import { CallController } from '#controllers/call';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';
import { notifyCallUpdate, notifyCallSynced } from 'src/services/call_events';

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
        '/calls/add-participant',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.addParticipant.mapper(req.body);
            const either = await controller.addParticipant.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            notifyCallUpdate(req.traceId, [either.data.customerId, either.data.attendantId], either.data);
            return res.status(200).send(either.data);
        }
    );

    app.put(
        '/calls/remove-participant',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.removeParticipant.mapper(req.body);
            const either = await controller.removeParticipant.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            notifyCallUpdate(req.traceId, [either.data.customerId, either.data.attendantId], either.data);
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
            notifyCallUpdate(req.traceId, [mapped.customerId, mapped.attendantId], null);
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

    app.put(
        '/calls/touch',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.touch.mapper(req.body);
            const either = await controller.touch.exec({ mapped });
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

    // Only ever called server-to-server by realtime when a user's websocket
    // connects — not exposed to the browser (web hears the result via the
    // call_synced SSE publish below instead, see init-call-events.ts).
    app.post(
        '/calls/sync-active-call',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.syncActiveCall.mapper(req.body);
            const either = await controller.syncActiveCall.exec(mapped);
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            notifyCallSynced(req.traceId, mapped.userId, either.data.call);
            return res.status(200).send(either.data);
        }
    );

    // Only ever called server-to-server by realtime right after its own
    // grace-timer bookkeeping detects a genuine reconnect — see
    // NotifyPartnerReconnected.
    app.post(
        '/calls/notify-partner-reconnected',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new CallController();
            const mapped = controller.notifyPartnerReconnected.mapper(req.body);
            const either = await controller.notifyPartnerReconnected.exec({ traceId: req.traceId, mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
};
