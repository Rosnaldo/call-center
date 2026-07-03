import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTimerStore } from '../../stores.ts';
import { createTimerStore } from '../store.ts';
import { buildCall } from '../../../__tests__/builders.ts';

beforeEach(() => {
  useTimerStore.getState().reset();
});

describe('initial state', () => {
  it('starts stopped with zero elapsed seconds', () => {
    const { status, elapsedSeconds } = useTimerStore.getState();
    expect(status).toBe('stopped');
    expect(elapsedSeconds).toBe(0);
  });
});

describe('play()', () => {
  it('transitions status from stopped to playing', () => {
    useTimerStore.getState().play();
    expect(useTimerStore.getState().status).toBe('playing');
  });

  it('does not change status or elapsedSeconds when already playing', () => {
    useTimerStore.getState().play();
    useTimerStore.setState({ elapsedSeconds: 5 });
    useTimerStore.getState().play();
    expect(useTimerStore.getState().status).toBe('playing');
    expect(useTimerStore.getState().elapsedSeconds).toBe(5);
  });

  it('does not reset elapsedSeconds when resuming', () => {
    useTimerStore.setState({ elapsedSeconds: 42 });
    useTimerStore.getState().play();
    expect(useTimerStore.getState().elapsedSeconds).toBe(42);
  });
});

describe('stop()', () => {
  it('transitions status from playing to stopped', () => {
    useTimerStore.getState().play();
    useTimerStore.getState().stop();
    expect(useTimerStore.getState().status).toBe('stopped');
  });

  it('does not change status or elapsedSeconds when already stopped', () => {
    useTimerStore.setState({ elapsedSeconds: 10 });
    useTimerStore.getState().stop();
    expect(useTimerStore.getState().status).toBe('stopped');
    expect(useTimerStore.getState().elapsedSeconds).toBe(10);
  });

  it('preserves elapsedSeconds when stopping', () => {
    useTimerStore.getState().play();
    useTimerStore.setState({ elapsedSeconds: 30 });
    useTimerStore.getState().stop();
    expect(useTimerStore.getState().elapsedSeconds).toBe(30);
  });
});

describe('reset()', () => {
  it('sets status to stopped and elapsedSeconds to 0', () => {
    useTimerStore.getState().play();
    useTimerStore.setState({ elapsedSeconds: 120 });

    useTimerStore.getState().reset();

    const { status, elapsedSeconds } = useTimerStore.getState();
    expect(status).toBe('stopped');
    expect(elapsedSeconds).toBe(0);
  });

  it('is idempotent when called on an already reset store', () => {
    useTimerStore.getState().reset();
    const { status, elapsedSeconds } = useTimerStore.getState();
    expect(status).toBe('stopped');
    expect(elapsedSeconds).toBe(0);
  });
});

describe('tick()', () => {
  it('increments elapsedSeconds by 1 when playing', () => {
    useTimerStore.getState().play();
    useTimerStore.getState().tick();
    expect(useTimerStore.getState().elapsedSeconds).toBe(1);
  });

  it('does not increment elapsedSeconds when stopped', () => {
    useTimerStore.getState().tick();
    expect(useTimerStore.getState().elapsedSeconds).toBe(0);
  });

  it('accumulates correctly across multiple ticks', () => {
    useTimerStore.getState().play();
    useTimerStore.getState().tick();
    useTimerStore.getState().tick();
    useTimerStore.getState().tick();
    expect(useTimerStore.getState().elapsedSeconds).toBe(3);
  });
});

describe('syncFromCall()', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops and freezes elapsedSeconds at accumulatedMs when isPlaying is false', () => {
    const call = buildCall({ isPlaying: false, overlapStartedAt: null, accumulatedMs: 42_000 });

    useTimerStore.getState().syncFromCall(call);

    expect(useTimerStore.getState().status).toBe('stopped');
    expect(useTimerStore.getState().elapsedSeconds).toBe(42);
  });

  it('plays and computes elapsedSeconds from accumulatedMs + time since startedAt when isPlaying is true', () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const call = buildCall({ isPlaying: true, overlapStartedAt: 100_000 - 5_000, accumulatedMs: 10_000 });

    useTimerStore.getState().syncFromCall(call);

    expect(useTimerStore.getState().status).toBe('playing');
    expect(useTimerStore.getState().elapsedSeconds).toBe(15);
  });

  it('follows isPlaying rather than overlapStartedAt — backend is the single source of truth', () => {
    // an inconsistent combination should never happen in practice, but the
    // store must still defer to isPlaying, not re-derive status from overlapStartedAt
    const call = buildCall({ isPlaying: false, overlapStartedAt: Date.now(), accumulatedMs: 0 });

    useTimerStore.getState().syncFromCall(call);

    expect(useTimerStore.getState().status).toBe('stopped');
  });

  it('resets to stopped/zero when call is null', () => {
    useTimerStore.getState().play();
    useTimerStore.setState({ elapsedSeconds: 99 });

    useTimerStore.getState().syncFromCall(null);

    expect(useTimerStore.getState().status).toBe('stopped');
    expect(useTimerStore.getState().elapsedSeconds).toBe(0);
  });

  it('keeps two independent stores (e.g. customer and attendant) in sync when fed the same call', () => {
    const attendantTimerStore = createTimerStore();
    const call = buildCall({ isPlaying: false, overlapStartedAt: null, accumulatedMs: 7_000 });

    useTimerStore.getState().syncFromCall(call);
    attendantTimerStore.getState().syncFromCall(call);

    expect(useTimerStore.getState().status).toBe(attendantTimerStore.getState().status);
    expect(useTimerStore.getState().elapsedSeconds).toBe(attendantTimerStore.getState().elapsedSeconds);
  });
});

describe('sequences', () => {
  it('pauses and resumes: ticks before stop and after play accumulate', () => {
    useTimerStore.getState().play();
    useTimerStore.getState().tick();
    useTimerStore.getState().tick(); // elapsedSeconds = 2

    useTimerStore.getState().stop();
    useTimerStore.getState().tick(); // no-op while stopped

    useTimerStore.getState().play();
    useTimerStore.getState().tick(); // elapsedSeconds = 3

    expect(useTimerStore.getState().elapsedSeconds).toBe(3);
    expect(useTimerStore.getState().status).toBe('playing');
  });

  it('reset mid-play zeroes out and stops ticking', () => {
    useTimerStore.getState().play();
    useTimerStore.getState().tick();
    useTimerStore.getState().tick(); // elapsedSeconds = 2

    useTimerStore.getState().reset();
    useTimerStore.getState().tick(); // no-op: stopped after reset

    expect(useTimerStore.getState().elapsedSeconds).toBe(0);
    expect(useTimerStore.getState().status).toBe('stopped');
  });

  it('stop → reset → play starts fresh from zero', () => {
    useTimerStore.getState().play();
    useTimerStore.setState({ elapsedSeconds: 99 });
    useTimerStore.getState().stop();
    useTimerStore.getState().reset();
    useTimerStore.getState().play();

    expect(useTimerStore.getState().elapsedSeconds).toBe(0);
    expect(useTimerStore.getState().status).toBe('playing');
  });
});
