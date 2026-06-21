import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBillingTimer } from '../useBillingTimer.ts';
import { useTimerStore, useCallStore } from '../../states/stores.ts';
import { buildCall } from '../../__tests__/builders.ts';
import { CallState } from '../../states/call/state.ts';

const CALL_ID = 'call-timer-test';

const makeCall = (status: CallState['status']): CallState =>
  buildCall({ id: CALL_ID, status });

beforeEach(() => {
  useTimerStore.getState().reset();
  useCallStore.setState({ call: null });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBillingTimer — timer / call store integration', () => {
  describe('call active', () => {
    it('plays the timer as soon as the call is active', () => {
      renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall('active') },
      });

      expect(useTimerStore.getState().status).toBe('playing');
    });

    it('increments elapsedSeconds once per second while active', () => {
      renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall('active') },
      });

      act(() => { vi.advanceTimersByTime(3000); });

      expect(useTimerStore.getState().elapsedSeconds).toBe(3);
    });
  });

  describe('call ends', () => {
    it('resets the timer when call becomes undefined', () => {
      const { rerender } = renderHook(
        ({ call }: { call: CallState | undefined }) => useBillingTimer(call),
        { initialProps: { call: makeCall('active') as CallState | undefined } },
      );

      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { rerender({ call: undefined }); });

      expect(useTimerStore.getState().status).toBe('stopped');
      expect(useTimerStore.getState().elapsedSeconds).toBe(0);
    });

    it('starts fresh if a new call begins after a previous one ended', () => {
      const { rerender } = renderHook(
        ({ call }: { call: CallState | undefined }) => useBillingTimer(call),
        { initialProps: { call: makeCall('active') as CallState | undefined } },
      );

      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { rerender({ call: undefined }); });

      const newCall = buildCall({ status: 'active' }); // different ID
      act(() => { rerender({ call: newCall }); });
      act(() => { vi.advanceTimersByTime(2000); });

      expect(useTimerStore.getState().elapsedSeconds).toBe(2);
    });
  });
});
