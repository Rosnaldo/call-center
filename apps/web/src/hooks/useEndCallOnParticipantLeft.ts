import { useCallback, useEffect, useRef } from 'react';
import { useDailyEvent } from '@daily-co/daily-react';
import type { DailyEventObjectParticipant, DailyEventObjectParticipantLeft } from '@daily-co/daily-js';
import { useCallStore, useCallViewStore } from '../states/stores.ts';

const GRACE_PERIOD_MS = 3 * 60 * 1000;

export function useEndCallOnParticipantLeft(): void {
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGraceTimer = useCallback(() => {
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
      graceTimeoutRef.current = null;
    }
  }, []);

  const onParticipantLeft = useCallback((event: DailyEventObjectParticipantLeft) => {
    if (event.participant.local) return;

    clearGraceTimer();
    useCallViewStore.getState().setViewState('call-interrupted');

    graceTimeoutRef.current = setTimeout(() => {
      graceTimeoutRef.current = null;
      useCallStore.getState().completeCall();
    }, GRACE_PERIOD_MS);
  }, [clearGraceTimer]);

  const onParticipantJoined = useCallback((event: DailyEventObjectParticipant) => {
    if (event.participant.local) return;
    if (!graceTimeoutRef.current) return;

    clearGraceTimer();
    if (useCallViewStore.getState().viewState === 'call-interrupted') {
      useCallViewStore.getState().setViewState('in-call');
    }
  }, [clearGraceTimer]);

  useDailyEvent('participant-left', onParticipantLeft);
  useDailyEvent('participant-joined', onParticipantJoined);

  useEffect(() => clearGraceTimer, [clearGraceTimer]);
}
