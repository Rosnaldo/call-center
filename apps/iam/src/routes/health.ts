import { type Application } from 'express';

export default (app: Application) => {
    app.get(
        '/health',
        async (req, res) => {
            return res.status(200).send('ok');
        }
    );
};
