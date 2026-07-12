import { describe, it, expect, beforeEach } from 'vitest';
import { useCallStore, useTimerStore, useBillingStore } from '../../stores.ts';
import { buildCall } from '../../../__tests__/builders.ts';

// updateCall: the single source of truth for call state, fed by the
// call-events SSE stream's update_call event (published by IAM alongside
// every call mutation — accept, complete, sync, participant add/remove,
// delete, partner reconnect). Replaces the old participantJoined/
// participantLeft/callDeleted/partnerReconnected actions, which each used to
// duplicate this same sync. It no longer touches incomingCall either — IAM
// publishes update_incomingcall separately for every case that needs it, so
// only that store's own updateIncomingCall clears it now.
describe('call store — updateCall', () => {
  beforeEach(() => {
    useCallStore.setState({ call: null });
    useTimerStore.getState().reset();
    useBillingStore.getState().setInitialTokens(0);
  });

  it('syncs call, timer and billing tokens', () => {
    const call = buildCall({ overlapStartedAt: null, accumulatedMs: 90_000, isPlaying: false, tokensToBeCharged: 2 });

    useCallStore.getState().updateCall(call);

    expect(useCallStore.getState().call).toEqual(call);
    expect(useTimerStore.getState().status).toBe('stopped');
    expect(useTimerStore.getState().elapsedSeconds).toBe(90);
    expect(useBillingStore.getState().initialTokens).toBe(2);
  });

  it('keeps the timer ticking from where the call left off', () => {
    const call = buildCall({ isPlaying: true, accumulatedMs: 5_000, tokensToBeCharged: 1 });

    useCallStore.getState().updateCall(call);

    expect(useCallStore.getState().call).toEqual(call);
    expect(useTimerStore.getState().status).toBe('playing');
    expect(useBillingStore.getState().initialTokens).toBe(1);
  });

  it('nulls the call and nothing else', () => {
    const call = buildCall();
    useCallStore.setState({ call });
    useTimerStore.getState().play();

    useCallStore.getState().updateCall(null);

    expect(useCallStore.getState().call).toBeNull();
    // unlike syncActiveCall's null branch (resetCallState), updateCall(null)
    // doesn't touch the timer or anything else
    expect(useTimerStore.getState().status).toBe('playing');
  });
});
