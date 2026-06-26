import { type Application, type Request, type Response } from 'express';
import { DailyWebhookBody } from './daily_types';
import {
    onMeetingStarted,
    onMeetingEnded,
    onParticipantJoined,
    onParticipantLeft,
} from './daily_handlers';

export default (app: Application) => {
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
                onParticipantJoined(body.payload);
                break;
            case 'participant.left':
                onParticipantLeft(body.payload);
                break;
        }

        res.sendStatus(200);
    });
};
