import { type Application, type Request, type Response } from 'express';
import { ISocketServer } from '#websocket/socket';
import { IamWebhookBody } from './iam_types';
import { onSendIncomingCall, onCancelIncomingCall, onCallAccepted } from './iam_handlers';

export default (app: Application, wss: ISocketServer) => {
    app.post('/webhooks/iam', (req: Request, res: Response) => {
        const body = req.body as IamWebhookBody;

        switch (body.event) {
            case 'incoming_call_sent':
                onSendIncomingCall(wss, body.payload);
                break;
            case 'incoming_call_cancelled':
                onCancelIncomingCall(wss, body.payload);
                break;
            case 'call_accepted':
                onCallAccepted(wss, body.payload);
                break;
        }

        res.sendStatus(200);
    });
};
