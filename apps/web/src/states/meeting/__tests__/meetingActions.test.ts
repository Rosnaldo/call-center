import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMeetingStore, useCallStore, useTimerStore, useBillingStore, useCallViewStore, useCurrentUserStore, useOnlineUsersStore } from '../../stores.ts';
import { buildCall, buildOnlineUserState } from '../../../__tests__/builders.ts';
import { useCallViewState } from '../../../hooks/useCallViewState.ts';

beforeEach(() => {
  useCallStore.setState({ call: null });
  useTimerStore.getState().reset();
  useBillingStore.getState().setInitialTokens(0);
  useBillingStore.getState().closeCalculationModal();
  useBillingStore.getState().closeSummaryModal();
  useCallViewStore.setState({ selectedAttendantId: null, isLeader: false });
  useCurrentUserStore.getState().setCurrentUser(null);
  useOnlineUsersStore.setState({ users: [] });
});

describe('meeting store — meetingEnded', () => {
  const customer = buildOnlineUserState({ id: 'cust-1', role: 'customer', status: 'in-call' });
  const attendant = buildOnlineUserState({ id: 'att-1', role: 'attendant', status: 'in-call' });

  // The call itself is nulled independently now, via the call-events SSE
  // stream's call_deleted event (see call/actions.ts's callDeleted test) —
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

  it('flips the logged-in currentUser back to idle', () => {
    const call = buildCall({ customerId: customer.id, attendantId: attendant.id });
    useCurrentUserStore.getState().setCurrentUser({ ...attendant, status: 'in-call' });

    useMeetingStore.getState().meetingEnded(call);

    expect(useCurrentUserStore.getState().currentUser?.status).toBe('idle');
  });

  it('does nothing to currentUser when nobody is logged in locally', () => {
    const call = buildCall({ customerId: customer.id, attendantId: attendant.id });

    expect(() => useMeetingStore.getState().meetingEnded(call)).not.toThrow();
    expect(useCurrentUserStore.getState().currentUser).toBeNull();
  });

  it('flips both the customer and attendant back to idle in the online users list', () => {
    const call = buildCall({ customerId: customer.id, attendantId: attendant.id });
    useOnlineUsersStore.setState({ users: [customer, attendant] });

    useMeetingStore.getState().meetingEnded(call);

    const users = useOnlineUsersStore.getState().users;
    expect(users.find((u) => u.id === customer.id)?.status).toBe('idle');
    expect(users.find((u) => u.id === attendant.id)?.status).toBe('idle');
  });

  it('closes the billing calculation modal and opens the billing summary modal with the ended call', () => {
    const call = buildCall({ customerId: customer.id, attendantId: attendant.id });
    useBillingStore.getState().openCalculationModal();

    useMeetingStore.getState().meetingEnded(call);

    expect(useBillingStore.getState().isCalculationModalOpen).toBe(false);
    expect(useBillingStore.getState().completedCallSummary).toEqual(call);
  });
});
