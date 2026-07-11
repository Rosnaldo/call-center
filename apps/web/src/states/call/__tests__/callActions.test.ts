import { describe, it, expect, beforeEach } from 'vitest';
import { useCallStore, useTimerStore, useBillingStore, useIncomingCallStore } from '../../stores.ts';
import { buildCall } from '../../../__tests__/builders.ts';

// participantJoined/participantLeft: relocated here from meeting/actions.ts's
// old syncCall helper (fed by the call-events SSE stream now — see
// init-call-events.ts — instead of the websocket's participant_joined/left).
describe('call store — participantJoined/participantLeft', () => {
  beforeEach(() => {
    useCallStore.setState({ call: null });
    useTimerStore.getState().reset();
    useBillingStore.getState().setInitialTokens(0);
    useIncomingCallStore.setState({ incomingCall: { customerId: 'c', attendantId: 'a', calledBy: 'customer' } });
  });

  it('participantJoined syncs call, timer and billing tokens, and clears incomingCall', () => {
    const call = buildCall({ overlapStartedAt: null, accumulatedMs: 90_000, isPlaying: false, tokensToBeCharged: 2 });

    useCallStore.getState().participantJoined(call);

    expect(useCallStore.getState().call).toEqual(call);
    expect(useTimerStore.getState().status).toBe('stopped');
    expect(useTimerStore.getState().elapsedSeconds).toBe(90);
    expect(useBillingStore.getState().initialTokens).toBe(2);
    expect(useIncomingCallStore.getState().incomingCall).toBeNull();
  });

  it('participantLeft keeps the timer ticking from where the call left off', () => {
    const call = buildCall({ isPlaying: true, accumulatedMs: 5_000, tokensToBeCharged: 1 });

    useCallStore.getState().participantLeft(call);

    expect(useCallStore.getState().call).toEqual(call);
    expect(useTimerStore.getState().status).toBe('playing');
    expect(useBillingStore.getState().initialTokens).toBe(1);
  });
});

// callDeleted: fed by the call-events SSE stream's call_deleted event
// (published by IAM's /calls/delete route) — only nulls call, nothing else;
// the rest of what meeting_ended used to do alongside it (onlineUsers/
// billing/chat/timer) still runs separately, see meeting/actions.ts.
describe('call store — callDeleted', () => {
  it('nulls the call and nothing else', () => {
    const call = buildCall();
    useCallStore.setState({ call });
    useTimerStore.getState().play();

    useCallStore.getState().callDeleted();

    expect(useCallStore.getState().call).toBeNull();
    // unlike meetingEnded, callDeleted doesn't touch the timer
    expect(useTimerStore.getState().status).toBe('playing');
  });
});
