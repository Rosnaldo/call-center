import { type Application, type Request, type Response } from 'express';
import { IamWebhookBody } from './iam_types';
import { onSendIncomingCall, onCancelIncomingCall, onCallAccepted } from './iam_handlers';

export default (app: Application) => {
    app.post('/webhooks/iam', (req: Request, res: Response) => {
        const body = req.body as IamWebhookBody;

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
        }

        res.sendStatus(200);
    });
};
