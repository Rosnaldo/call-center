import logger from '#logger';
import { type Application, type Request, type Response } from 'express';
import { DailyWebhookBody } from './daily_types';
import {
    onMeetingStarted,
    onMeetingEnded,
    onParticipantJoined,
    onParticipantLeft,
} from './daily_handlers';

export default (app: Application) => {
    app.get('/webhooks/daily', (_req: Request, res: Response) => {
        res.sendStatus(200);
    });

    app.post('/webhooks/daily', (req: Request, res: Response) => {
        const body = req.body as DailyWebhookBody;

        if (!body?.type) return res.sendStatus(200);

        logger.info({ type: body.type }, 'daily webhook received');

        switch (body.type) {
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
