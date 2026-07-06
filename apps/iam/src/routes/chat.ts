import { type Application } from 'express';
import { ChatController } from '#controllers/chat';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';
import upload from '#utils/chat/multer-upload';

export default (app: Application) => {
    app.get(
        '/chat/get-messages',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new ChatController();
            const mapped = controller.getMessages.mapper(req.query);
            const either = await controller.getMessages.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.post(
        '/chat/send-message',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new ChatController();
            const mapped = controller.sendMessage.mapper(req.body);
            const either = await controller.sendMessage.exec({ traceId: req.traceId, mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.post(
        '/chat/upload-file',
        GetKeycloakUser,
        upload.single('file'),
        async (req, res) => {
            if (!req.file) {
                return res.status(400).json({ error: 'file é obrigatório' });
            }

            const controller = new ChatController();
            const either = await controller.uploadFile.exec({
                traceId: req.traceId,
                mapped: {
                    customerId: req.body.customerId,
                    attendantId: req.body.attendantId,
                    sender: req.body.sender,
                    buffer: req.file.buffer,
                    originalName: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                },
            });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );

    app.delete(
        '/chat/delete',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new ChatController();
            const mapped = controller.delete.mapper(req.body);
            const either = await controller.delete.exec({ mapped });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
};
