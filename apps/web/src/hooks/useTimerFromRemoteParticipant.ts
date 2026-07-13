import { useEffect } from 'react';
import { useTimerStore } from '../states/stores.ts';

// Drives the visible call timer purely off Daily.co's own remote-participant
// presence — the server-side call record no longer carries a playing/paused
// flag (see CallState), so this is the only thing that starts/stops it now.
// elapsedSeconds itself still comes from the server via syncFromCall
// (useBillingTimer) — this only ever touches status.
export function useTimerFromRemoteParticipant(remoteParticipantId: string | undefined): void {
  useEffect(() => {
    if (remoteParticipantId) {
      useTimerStore.getState().play();
    } else {
      useTimerStore.getState().stop();
    }
  }, [remoteParticipantId]);
}
