import { type Application } from 'express';
import logger from '#logger';
import { defaultValidateToken } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.post('/auth/validate-token', async (req, res) => {
        try {
            const token = req.headers.authorization || '';
            if (!token) {
                return res.status(401).send({ isError: true, message: 'Token não informado' });
            }
            const payload = await defaultValidateToken(token);
            return res.status(200).send({
                id: payload.sub,
                email: payload.email ?? null,
                firstName: payload.given_name ?? null,
                lastName: payload.family_name ?? null,
            });
        } catch (err) {
            logger.error({ err: err instanceof Error ? err.message : err }, 'auth/validate-token failed');
            return res.status(401).send({ isError: true, message: 'Token inválido' });
        }
    });
};
