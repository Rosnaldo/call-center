import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { buildCall } from '../../__tests__/builders.ts';

const handlers: Record<string, (event: any) => void> = {};

vi.mock('@daily-co/daily-react', () => ({
  useDailyEvent: (event: string, cb: (event: any) => void) => {
    handlers[event] = cb;
  },
}));

import { useEndCallOnParticipantLeft } from '../useEndCallOnParticipantLeft.ts';
import { useCallStore, useCallViewStore } from '../../states/stores.ts';
import * as callsService from '../../services/api/calls.ts';

const remoteLeft = { participant: { local: false } };
const localLeft = { participant: { local: true } };
const remoteJoined = { participant: { local: false } };

beforeEach(() => {
  vi.useFakeTimers();
  useCallStore.setState({ call: buildCall() });
  useCallViewStore.getState().setViewState('in-call');
  vi.spyOn(callsService, 'completeCall').mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useEndCallOnParticipantLeft', () => {
  it('switches to call-interrupted when the remote participant leaves', () => {
    renderHook(() => useEndCallOnParticipantLeft());

    act(() => { handlers['participant-left'](remoteLeft); });

    expect(useCallViewStore.getState().viewState).toBe('call-interrupted');
  });

  it('ignores the local participant leaving', () => {
    renderHook(() => useEndCallOnParticipantLeft());

    act(() => { handlers['participant-left'](localLeft); });

    expect(useCallViewStore.getState().viewState).toBe('in-call');
  });

  it('ends the call after the 3 minute grace period with nobody returning', () => {
    renderHook(() => useEndCallOnParticipantLeft());

    act(() => { handlers['participant-left'](remoteLeft); });
    act(() => { vi.advanceTimersByTime(3 * 60 * 1000); });

    expect(callsService.completeCall).toHaveBeenCalledOnce();
  });

  it('cancels the grace period and restores in-call when the remote participant rejoins in time', () => {
    renderHook(() => useEndCallOnParticipantLeft());

    act(() => { handlers['participant-left'](remoteLeft); });
    act(() => { vi.advanceTimersByTime(60 * 1000); });
    act(() => { handlers['participant-joined'](remoteJoined); });
    act(() => { vi.advanceTimersByTime(3 * 60 * 1000); });

    expect(useCallViewStore.getState().viewState).toBe('in-call');
    expect(callsService.completeCall).not.toHaveBeenCalled();
  });
});
