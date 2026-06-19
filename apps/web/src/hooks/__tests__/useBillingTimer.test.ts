import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBillingTimer } from '../useBillingTimer.ts';
import { useTimerStore } from '../../states/timer/store.ts';
import { useCallStore } from '../../states/call/store.ts';
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

  describe('call interrupted', () => {
    it('stops the timer when status changes to call-interrupteded', () => {
      const { rerender } = renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall('active') },
      });

      act(() => { vi.advanceTimersByTime(2000); });
      act(() => { rerender({ call: makeCall('call-interrupteded') }); });

      expect(useTimerStore.getState().status).toBe('stopped');
    });

    it('freezes elapsedSeconds during the interruption window', () => {
      const { rerender } = renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall('active') },
      });

      act(() => { vi.advanceTimersByTime(4000); });
      const frozenAt = useTimerStore.getState().elapsedSeconds;

      act(() => { rerender({ call: makeCall('call-interrupteded') }); });
      act(() => { vi.advanceTimersByTime(10000); });

      expect(useTimerStore.getState().elapsedSeconds).toBe(frozenAt);
    });
  });

  describe('call reactivated after interruption', () => {
    it('resumes the timer after reactivation', () => {
      const { rerender } = renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall('active') },
      });

      act(() => { vi.advanceTimersByTime(3000); });
      act(() => { rerender({ call: makeCall('call-interrupteded') }); });
      act(() => { vi.advanceTimersByTime(10000); });
      act(() => { rerender({ call: makeCall('active') }); });
      act(() => { vi.advanceTimersByTime(2000); });

      expect(useTimerStore.getState().status).toBe('playing');
      expect(useTimerStore.getState().elapsedSeconds).toBe(5); // 3 before + 2 after
    });

    it('does not count interrupted time in elapsedSeconds', () => {
      const { rerender } = renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall('active') },
      });

      act(() => { vi.advanceTimersByTime(4000); }); // 4s active
      act(() => { rerender({ call: makeCall('call-interrupteded') }); });
      act(() => { vi.advanceTimersByTime(60000); }); // 60s interrupted — must not count
      act(() => { rerender({ call: makeCall('active') }); });
      act(() => { vi.advanceTimersByTime(3000); }); // 3s active

      expect(useTimerStore.getState().elapsedSeconds).toBe(7); // 4 + 3, not 4 + 60 + 3
    });

    it('can survive multiple interrupt / resume cycles', () => {
      const { rerender } = renderHook(({ call }) => useBillingTimer(call), {
        initialProps: { call: makeCall('active') },
      });

      act(() => { vi.advanceTimersByTime(2000); }); // +2s
      act(() => { rerender({ call: makeCall('call-interrupteded') }); });
      act(() => { vi.advanceTimersByTime(30000); }); // ignored
      act(() => { rerender({ call: makeCall('active') }); });
      act(() => { vi.advanceTimersByTime(2000); }); // +2s
      act(() => { rerender({ call: makeCall('call-interrupteded') }); });
      act(() => { vi.advanceTimersByTime(30000); }); // ignored
      act(() => { rerender({ call: makeCall('active') }); });
      act(() => { vi.advanceTimersByTime(1000); }); // +1s

      expect(useTimerStore.getState().elapsedSeconds).toBe(5); // 2 + 2 + 1
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
