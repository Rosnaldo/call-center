export type DailyWebhookEvent =
    | 'meeting.started'
    | 'meeting.ended'
    | 'participant.joined'
    | 'participant.left'

export interface DailyMeetingPayload {
    meeting_id: string;
    room: string;
    start_ts: number;
}

export interface DailyParticipantPayload {
    session_id: string;
    room: string;
    user_id: string;
    user_name: string;
    joined_at: number;
    duration?: number;
}

export type DailyWebhookBody =
    | { type: 'meeting.started'; payload: DailyMeetingPayload }
    | { type: 'meeting.ended'; payload: DailyMeetingPayload }
    | { type: 'participant.joined'; payload: DailyParticipantPayload }
    | { type: 'participant.left'; payload: DailyParticipantPayload }
