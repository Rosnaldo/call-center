import { type Application } from 'express';
import { DailyRoomController } from '#controllers/daily_room';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.post(
        '/daily/rooms',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new DailyRoomController();
            const mapped = controller.findOrCreate.mapper(req.body);
            const either = await controller.findOrCreate.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
};
