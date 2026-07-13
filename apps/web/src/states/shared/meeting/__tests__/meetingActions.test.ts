import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMeetingStore, useCallStore, useTimerStore, useBillingStore, useCallViewStore, useCurrentUserStore } from '../../../stores.ts';
import { buildCall, buildOnlineUserState } from '../../../../__tests__/builders.ts';
import { useCallViewState } from '../../../../hooks/useCallViewState.ts';

beforeEach(() => {
  useCallStore.setState({ call: null });
  useTimerStore.getState().reset();
  useBillingStore.getState().setInitialTokens(0);
  useBillingStore.getState().closeCalculationModal();
  useBillingStore.getState().closeSummaryModal();
  useCallViewStore.setState({ selectedAttendantId: null, isLeader: false });
  useCurrentUserStore.getState().setCurrentUser(null);
});

describe('meeting store — meetingEnded', () => {
  const customer = buildOnlineUserState({ id: 'cust-1', role: 'customer', status: 'in-call' });
  const attendant = buildOnlineUserState({ id: 'att-1', role: 'attendant', status: 'in-call' });

  // The call itself is nulled independently now, via the call-events SSE
  // stream's update_call event (see call/actions.ts's updateCall test) —
  // meetingEnded resets the timer/callView regardless, since in production
  // both fire from the same underlying call-ending trigger.
  it('resets the timer and sends callView back to none', () => {
    const call = buildCall({ customerId: customer.id, attendantId: attendant.id });
    useCallStore.setState({ call: null });
    useCallViewStore.setState({ isLeader: true });
    useTimerStore.getState().play();

    useMeetingStore.getState().meetingEnded(call);

    expect(useTimerStore.getState().status).toBe('stopped');
    expect(useTimerStore.getState().elapsedSeconds).toBe(0);

    const { result } = renderHook(() => useCallViewState());
    expect(result.current).toBe('none');
  });

  it('closes the billing calculation modal and opens the billing summary modal with the ended call', () => {
    const call = buildCall({ customerId: customer.id, attendantId: attendant.id });
    useBillingStore.getState().openCalculationModal();

    useMeetingStore.getState().meetingEnded(call);

    expect(useBillingStore.getState().isCalculationModalOpen).toBe(false);
    expect(useBillingStore.getState().completedCallSummary).toEqual(call);
  });
});
