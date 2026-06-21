import { DailyMeetingPayload, DailyParticipantPayload, DailyWaitingParticipantPayload } from './daily_types';

export function onMeetingStarted(payload: DailyMeetingPayload): void {
    console.log(`[Daily] meeting.started room=${payload.room}`);
}

export function onMeetingEnded(payload: DailyMeetingPayload): void {
    console.log(`[Daily] meeting.ended room=${payload.room}`);
}

export function onParticipantJoined(payload: DailyParticipantPayload): void {
    console.log(`[Daily] participant.joined room=${payload.room} user=${payload.user_name}`);
}

export function onParticipantLeft(payload: DailyParticipantPayload): void {
    console.log(`[Daily] participant.left room=${payload.room} user=${payload.user_name}`);
}

export function onWaitingParticipantJoined(payload: DailyWaitingParticipantPayload): void {
    console.log(`[Daily] waiting-participant.joined room=${payload.room} user=${payload.user_name}`);
}

export function onWaitingParticipantLeft(payload: DailyWaitingParticipantPayload): void {
    console.log(`[Daily] waiting-participant.left room=${payload.room} user=${payload.user_name}`);
}
