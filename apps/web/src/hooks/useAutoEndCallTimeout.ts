import { useEffect, useState } from 'react';
import { useCallStore } from '../states/stores.ts';

const PARTICIPANT_JOIN_TIMEOUT_SECONDS = 30;

// Guards against the room being stuck in 'in-call' forever when the other
// party's Daily track never attaches (e.g. their join silently failed).
// Mirrors the same "waiting to join" signal CallFooterActions uses to
// disable the manual end-call button. `remoteParticipantId` is the current
// remote session id, if any — the countdown resets and stops whenever it's
// present, and restarts from scratch each time it goes away again.
export function useAutoEndCallTimeout(remoteParticipantId: string | undefined): number {
  const [secondsUntilAutoEnd, setSecondsUntilAutoEnd] = useState(PARTICIPANT_JOIN_TIMEOUT_SECONDS);

  useEffect(() => {
    if (remoteParticipantId) return;

    setSecondsUntilAutoEnd(PARTICIPANT_JOIN_TIMEOUT_SECONDS);

    const interval = setInterval(() => {
      setSecondsUntilAutoEnd(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          useCallStore.getState().completeCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remoteParticipantId]);

  return secondsUntilAutoEnd;
}
