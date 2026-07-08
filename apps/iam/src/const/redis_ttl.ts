import { MAX_CALL_DURATION_SECONDS } from '@repo/shared-types';

// Safety net so an orphaned call record (e.g. the eject/delete step in
// onMeetingEnded fails silently) can't block that customer/attendant pair
// from ever starting a fresh call — every write refreshes it, so a call
// that's genuinely still active never actually hits this ceiling.
export const CALL_TTL_SECONDS = MAX_CALL_DURATION_SECONDS;
