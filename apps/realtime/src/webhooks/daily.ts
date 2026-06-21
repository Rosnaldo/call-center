import { type Application, type Request, type Response } from 'express';
import { ISocketServer } from '#websocket/socket';
import { DailyWebhookBody } from './daily_types';
import {
    onMeetingStarted,
    onMeetingEnded,
    onParticipantJoined,
    onParticipantLeft,
    onWaitingParticipantJoined,
    onWaitingParticipantLeft,
} from './daily_handlers';

export default (app: Application, wss: ISocketServer) => {
    app.post('/webhooks/daily', (req: Request, res: Response) => {
        const body = req.body as DailyWebhookBody;

        switch (body.event) {
            case 'meeting.started':
                onMeetingStarted(body.payload);
                break;
            case 'meeting.ended':
                onMeetingEnded(body.payload);
                break;
            case 'participant.joined':
                onParticipantJoined(wss, body.payload);
                break;
            case 'participant.left':
                onParticipantLeft(body.payload);
                break;
            case 'waiting-participant.joined':
                onWaitingParticipantJoined(body.payload);
                break;
            case 'waiting-participant.left':
                onWaitingParticipantLeft(body.payload);
                break;
        }

        res.sendStatus(200);
    });
};
