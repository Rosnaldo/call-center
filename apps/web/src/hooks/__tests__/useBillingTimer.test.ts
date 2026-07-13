import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBillingTimer } from '../useBillingTimer.ts';
import { useTimerStore, useCallStore, useCurrentUserStore, useOnlineUsersStore, useBillingStore } from '../../states/stores.ts';
import { buildCall, buildOnlineUserState } from '../../__tests__/builders.ts';
import { CallState } from '../../states/call/state.ts';

const CALL_ID = 'call-timer-test';

const makeCall = (): CallState =>
  buildCall({ id: CALL_ID });

beforeEach(() => {
  useTimerStore.getState().reset();
  useCallStore.setState({ call: null });
  useBillingStore.getState().setInitialTokens(0);
  useCurrentUserStore.getState().setCurrentUser(null);
  useOnlineUsersStore.setState({ users: [] });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBillingTimer — timer / call store integration', () => {
  describe('call active', () => {
    // Status is driven by useTimerFromRemoteParticipant now (Daily.co
    // remote-participant presence, see CallViewport.tsx) — useBillingTimer
    // only ever syncs elapsedSeconds/billing off the server-side call record.
    it('does not touch timer status', () => {
      renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall() },
      });

      expect(useTimerStore.getState().status).toBe('stopped');
    });

    it('increments elapsedSeconds once per second while active', () => {
      renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall() },
      });

      act(() => { vi.advanceTimersByTime(3000); });

      expect(useTimerStore.getState().elapsedSeconds).toBe(3);
    });
  });

  describe('call ends', () => {
    it('resets the timer when call becomes undefined', () => {
      const { rerender } = renderHook(
        ({ call }: { call: CallState | undefined }) => useBillingTimer(call),
        { initialProps: { call: makeCall() as CallState | undefined } },
      );

      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { rerender({ call: undefined }); });

      expect(useTimerStore.getState().status).toBe('stopped');
      expect(useTimerStore.getState().elapsedSeconds).toBe(0);
    });

    it('starts fresh if a new call begins after a previous one ended', () => {
      const { rerender } = renderHook(
        ({ call }: { call: CallState | undefined }) => useBillingTimer(call),
        { initialProps: { call: makeCall() as CallState | undefined } },
      );

      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { rerender({ call: undefined }); });

      const newCall = buildCall(); // different ID
      act(() => { rerender({ call: newCall }); });
      act(() => { vi.advanceTimersByTime(2000); });

      expect(useTimerStore.getState().elapsedSeconds).toBe(2);
    });
  });

  describe('billing schedule (half-cycle rule)', () => {
    const setupBillableCall = () => {
      const call = makeCall();
      const customer = buildOnlineUserState({ id: call.customerId, tokens: 10 });
      useCurrentUserStore.getState().setCurrentUser(customer);
      useOnlineUsersStore.setState({ users: [customer] });
      renderHook(({ call }) => useBillingTimer(call), { initialProps: { call } });
    };

    it('does not charge the 1st token before 2.5 minutes', () => {
      setupBillableCall();

      act(() => { vi.advanceTimersByTime(2.5 * 60 * 1000 - 1000); });

      expect(useBillingStore.getState().initialTokens).toBe(0); // no token charged yet
    });

    it('charges the 1st token exactly at 2.5 minutes', () => {
      setupBillableCall();

      act(() => { vi.advanceTimersByTime(2.5 * 60 * 1000); });

      expect(useBillingStore.getState().initialTokens).toBe(1); // 1 token charged
    });

    it('charges the 2nd token at 7.5 minutes and the 3rd at 12.5 minutes', () => {
      setupBillableCall();

      act(() => { vi.advanceTimersByTime(7.5 * 60 * 1000); });
      expect(useBillingStore.getState().initialTokens).toBe(2); // 2 tokens charged

      act(() => { vi.advanceTimersByTime(5 * 60 * 1000); }); // + 5min = 12.5min total
      expect(useBillingStore.getState().initialTokens).toBe(3); // 3 tokens charged
    });

    it('does not double-charge on the tick right after crossing a threshold', () => {
      setupBillableCall();

      act(() => { vi.advanceTimersByTime(2.5 * 60 * 1000); });
      expect(useBillingStore.getState().initialTokens).toBe(1);

      act(() => { vi.advanceTimersByTime(1000); }); // one more tick, still within the same window
      expect(useBillingStore.getState().initialTokens).toBe(1);
    });
  });
});
