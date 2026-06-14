import { type Application } from 'express';
import { makeValidateToken } from '#middleware/get_keycloak_user';

export default (app: Application) => {
    app.post('/auth/validate-token', async (req, res) => {
        try {
            const token = req.headers.authorization || '';
            if (!token) {
                return res.status(401).send({ isError: true, message: 'Token não informado' });
            }
            const validateToken = makeValidateToken();
            const payload = await validateToken(token);
            return res.status(200).send({
                id: payload.sub,
                email: payload.email ?? null,
                firstName: payload.given_name ?? null,
                lastName: payload.family_name ?? null,
            });
        } catch {
            return res.status(401).send({ isError: true, message: 'Token inválido' });
        }
    });
};
