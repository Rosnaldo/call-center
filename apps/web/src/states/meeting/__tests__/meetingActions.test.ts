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

describe('meeting store — meetingStarted/updateJoinedView/updateLeftView', () => {
  it('syncs call, timer and billing tokens from the incoming call', () => {
    const call = buildCall({ overlapStartedAt: null, accumulatedMs: 90_000, isPlaying: false, tokensToBeCharged: 2 });

    useMeetingStore.getState().meetingStarted(call);

    expect(useCallStore.getState().call).toEqual(call);
    expect(useTimerStore.getState().status).toBe('stopped');
    expect(useTimerStore.getState().elapsedSeconds).toBe(90);
    expect(useBillingStore.getState().initialTokens).toBe(2);
  });

  it('updateJoinedView keeps the timer ticking from where the call left off', () => {
    const call = buildCall({ isPlaying: true, accumulatedMs: 5_000, tokensToBeCharged: 1 });

    useMeetingStore.getState().updateJoinedView(call);

    expect(useCallStore.getState().call).toEqual(call);
    expect(useTimerStore.getState().status).toBe('playing');
    expect(useBillingStore.getState().initialTokens).toBe(1);
  });
});

describe('meeting store — meetingEnded', () => {
  const customer = buildOnlineUserState({ id: 'cust-1', role: 'customer', status: 'in-call' });
  const attendant = buildOnlineUserState({ id: 'att-1', role: 'attendant', status: 'in-call' });

  it('clears the call, resets the timer and sends callView back to none', () => {
    const call = buildCall({ customerId: customer.id, attendantId: attendant.id });
    useCallStore.setState({ call });
    useCallViewStore.setState({ isLeader: true });
    useTimerStore.getState().play();

    useMeetingStore.getState().meetingEnded(call);

    expect(useCallStore.getState().call).toBeNull();
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
