import { type Application } from 'express';

import { UserController } from '#controllers/user';
import upload from '#utils/image/multer-upload';
import { GetUser } from '#middleware/get_user';
import { authorizeMiddleware } from '#middleware/authorize';
import { UserRole } from '@repo/shared-types';
import { GetKeycloakUser } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.get(
        '/users/count',
        GetKeycloakUser,
        GetUser,
        async (req, res) => {
            const controller = new UserController();
            const either = await controller.count!.get();
            if (either.isError) {
                return res.status(400).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
    app.get(
        '/users/list',
        GetKeycloakUser,
        GetUser,
        async (req, res) => {
            const { user } = req;
            const controller = new UserController();
            const params = controller.paginacao!.mapper(req.query);
            const either = await controller.paginacao!.get({ user, params });
            if (either.isError) {
                return res.status(400).send(either);
            }
            return res.status(200).send(either);
        }
    );
    app.get(
        '/users/find-by-slug',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new UserController();
            const params = controller.findBySlug.mapper(req.query);
            const either = await controller.findBySlug.get({ params });
            if (either.isError) {
                return res.status(either.status).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
    app.get(
        '/users/exists',
        GetKeycloakUser,
        async (req, res) => {
            const controller = new UserController();
            const params = controller.exists!.mapper({ ...req.query, userKc: req.userKc });
            const either = await controller.exists!.get({ params });
            if (either.isError) {
                return res.status(400).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
    app.post(
        '/users/create',
        GetKeycloakUser,
        GetUser,
        authorizeMiddleware([UserRole.admin]),
        async (req, res) => {
            const controller = new UserController();
            const mapped = controller.create!.mapper(req.body);
            const either = await controller.create!.exec({ mapped });
            if (either.isError) {
                return res.status(400).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
    app.put(
        '/users/edit',
        GetKeycloakUser,
        GetUser,
        authorizeMiddleware([UserRole.admin]),
        async (req, res) => {
            const controller = new UserController();
            const mapped = controller.edit!.mapper({ ...req.body });
            const either = await controller.edit!.exec({ mapped, userSource: req.user });
            if (either.isError) {
                return res.status(400).send(either);
            }
            return res.status(200).send(either.data);
        }
    );
    app.delete(
        '/users/delete',
        GetKeycloakUser,
        GetUser,
        authorizeMiddleware([UserRole.admin]),
        async (req, res) => {
            const controller = new UserController();
            const mapped = controller.delete!.mapper(req.query);
            const either = await controller.delete!.exec({ mapped, userSource: req.user });
            return res.status(200).send(either);
        }
    );
    app.post(
        '/users/upload-avatar',
        GetKeycloakUser,
        GetUser,
        upload.single('image'),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'Image is required' });
                }

                if (!req.file.mimetype.startsWith('image/')) {
                    return res.status(400).json({ error: 'Invalid file type' });
                }

                const userId = req.user._id;
                const controller = new UserController();
                const either = await controller.avatar!.exec({ userId, buffer: req.file.buffer, mimetype: req.file.mimetype, userSource: req.user });
                if (either.isError) {
                    return res.status(400).send(either);
                }
                return res.status(200).send(either.data);
            } catch (err) {
                res.status(500).json({ error: 'Failed to upload image' });
            }
        }
    );
};
