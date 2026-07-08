export const UniqueIndex = {
    User: {
        email: {
            key: 'unique_user_email_index',
            error: 'Já existe user com o mesmo email'
        }
    },
    CallHistory: {
        meetingId: {
            key: 'unique_call_history_meeting_id_index',
            error: 'Já existe call history para este meetingId'
        }
    },
};
