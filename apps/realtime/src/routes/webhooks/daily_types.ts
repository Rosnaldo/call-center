export type DailyWebhookEvent =
    | 'meeting.started'
    | 'meeting.ended'
    | 'participant.joined'
    | 'participant.left'
    | 'waiting-participant.joined'
    | 'waiting-participant.left';

export interface DailyMeetingPayload {
    id: string;
    room: string;
}

export interface DailyParticipantPayload {
    id: string;
    room: string;
    user_id: string;
    user_name: string;
    join_time: string;
    duration: number;
}

export interface DailyWaitingParticipantPayload {
    id: string;
    room: string;
    user_name: string;
}

export type DailyWebhookBody =
    | { event: 'meeting.started'; payload: DailyMeetingPayload }
    | { event: 'meeting.ended'; payload: DailyMeetingPayload }
    | { event: 'participant.joined'; payload: DailyParticipantPayload }
    | { event: 'participant.left'; payload: DailyParticipantPayload }
    | { event: 'waiting-participant.joined'; payload: DailyWaitingParticipantPayload }
    | { event: 'waiting-participant.left'; payload: DailyWaitingParticipantPayload };
