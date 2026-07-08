import { type Application } from 'express';
import logger from '#logger';
import { authenticate, AuthenticatedRequest } from 'src/middleware/authenticate';
import { getCallByUser, createCallForRoom, touchCall } from 'src/services/calls';
import { isUserPresentInRoom } from 'src/webhooks/daily_manager';

export default (app: Application) => {
    // Called when the user enters the app: reconciles IAM's call state against
    // the real Daily meeting presence, for the case where a page refresh, a
    // redis restart, or any other gap left the two sides disagreeing about
    // whether a call is still going on.
    //
    // - call exists but user isn't present in that room -> shouldJoin: true,
    //   so the client rejoins the Daily room it's supposed to be in.
    // - user is present in a room (client tells us which one, if it's
    //   currently connected to any) but no call record exists -> self-heals
    //   by creating one, same as onMeetingStarted's recovery path.
    app.post('/calls/sync', authenticate, async (req: AuthenticatedRequest, res) => {
        const userId = req.authUser!._id;
        const roomName = typeof req.body?.roomName === 'string' ? req.body.roomName : undefined;

        try {
            const call = await getCallByUser(userId);

            if (call) {
                // This is one of the two designated TTL touchpoints — refresh
                // it here since a call that's only ever being synced (no
                // participant join/leave in between) would otherwise never
                // get its expiry pushed out.
                await touchCall(req.traceId, call.customerId, call.attendantId);

                const present = await isUserPresentInRoom(call.roomName, userId);
                return res.status(200).send({ call, shouldJoin: !present });
            }

            if (roomName) {
                const present = await isUserPresentInRoom(roomName, userId);
                if (present) {
                    const created = await createCallForRoom(req.traceId, roomName);
                    if (created) return res.status(200).send({ call: created, shouldJoin: false });
                }
            }

            return res.status(200).send({ call: null, shouldJoin: false });
        } catch (error) {
            logger.error(error, 'calls sync: falha ao sincronizar call com o daily');
            return res.status(500).send({ isError: true, message: 'Falha ao sincronizar call' });
        }
    });
};
