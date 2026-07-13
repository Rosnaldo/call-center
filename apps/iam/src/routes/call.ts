import { type Application } from 'express';
import { CallController } from '#controllers/call';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';
import { notifyCallUpdate, notifyCallSynced } from 'src/services/call_events';

export default (app: Application) => {
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
};
