import logger from '#logger';
import { type Application, type Request, type Response } from 'express';
import { IamWebhookBody } from './iam_types';
import { onSendIncomingCall, onCancelIncomingCall, onCallAccepted, onCallCompleted } from './iam_handlers';

export default (app: Application) => {
    app.get('/webhooks/iam', (_req: Request, res: Response) => {
        res.sendStatus(200);
    });

    app.post('/webhooks/iam', (req: Request, res: Response) => {
        const body = req.body as IamWebhookBody;

        logger.info({ type: body.event }, 'iam webhook received');

        switch (body.event) {
            case 'incoming_call_sent':
                onSendIncomingCall(body.payload);
                break;
            case 'incoming_call_cancelled':
                onCancelIncomingCall(body.payload);
                break;
            case 'call_accepted':
                onCallAccepted(body.payload);
                break;
            case 'call_completed':
                onCallCompleted(body.payload);
                break;
        }

        res.sendStatus(200);
    });
};
