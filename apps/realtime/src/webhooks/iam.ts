import { type Application, type Request, type Response } from 'express';
import { ISocketServer } from '#websocket/socket';
import { IamWebhookBody } from './iam_types';
import { onSendIncomingCall, onCancelIncomingCall } from './iam_handlers';

export default (app: Application, wss: ISocketServer) => {
    app.post('/webhooks/iam', (req: Request, res: Response) => {
        const body = req.body as IamWebhookBody;

        switch (body.event) {
            case 'send_incoming_call':
                onSendIncomingCall(wss, body.payload);
                break;
            case 'cancel_incoming_call':
                onCancelIncomingCall(wss, body.payload);
                break;
        }

        res.sendStatus(200);
    });
};
