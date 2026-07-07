import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MINUTES_PER_TOKEN } from '@repo/shared-types';
import { InfoCard } from '../InfoCard.tsx';
import { buildCall, buildOnlineUserState } from '../../../../__tests__/builders.ts';
import { useBillingStore, useCallStore, useCallViewStore, useOnlineUsersStore, useTimerStore } from '../../../../states/stores.ts';

const BLOCK = MINUTES_PER_TOKEN * 60; // 300s
const HALF_BLOCK = BLOCK / 2; // 150s

const setupCall = (customerTokens = 5) => {
  const call = buildCall();
  const customer = buildOnlineUserState({ id: call.customerId, tokens: customerTokens });
  useCallStore.setState({ call });
  useOnlineUsersStore.setState({ users: [customer] });
  useCallViewStore.setState({ viewState: 'in-call' });
  return call;
};

beforeEach(() => {
  useCallStore.setState({ call: null });
  useOnlineUsersStore.setState({ users: [] });
  useCallViewStore.setState({ viewState: 'none', selectedAttendantId: null });
  useBillingStore.getState().setInitialTokens(1);
  useTimerStore.setState({ status: 'stopped', elapsedSeconds: 0 });
});

describe('InfoCard – billing countdown timer (half-cycle rule)', () => {
  it('renders nothing when there is no active call', () => {
    const { container } = render(<InfoCard />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the half-length first window (2.5min) at t=0', () => {
    setupCall();
    useTimerStore.setState({ elapsedSeconds: 0 });

    render(<InfoCard />);

    expect(screen.getByText('2:30 / 2:30')).toBeDefined();
  });

  it('decrements the countdown as elapsed increases within the first window', () => {
    setupCall();
    useTimerStore.setState({ elapsedSeconds: 1 });
    const { rerender } = render(<InfoCard />);
    expect(screen.getByText('2:29 / 2:30')).toBeDefined();

    useTimerStore.setState({ elapsedSeconds: 2 });
    rerender(<InfoCard />);
    expect(screen.getByText('2:28 / 2:30')).toBeDefined();
  });

  it('reaches 0:00 exactly at 2.5 minutes (1st token due)', () => {
    setupCall();
    useTimerStore.setState({ elapsedSeconds: HALF_BLOCK });

    render(<InfoCard />);

    expect(screen.getByText('0:00 / 2:30')).toBeDefined();
  });

  it('progress bar starts at 100% width at t=0', () => {
    setupCall();
    useTimerStore.setState({ elapsedSeconds: 0 });

    const { container } = render(<InfoCard />);
    const bar = container.querySelector('[style*="width"]') as HTMLElement;
    expect(bar?.style.width).toBe('100%');
  });

  it('progress bar reaches 0% width at the end of the first window', () => {
    setupCall();
    useTimerStore.setState({ elapsedSeconds: HALF_BLOCK });

    const { container } = render(<InfoCard />);
    const bar = container.querySelector('[style*="width"]') as HTMLElement;
    expect(bar?.style.width).toBe('0%');
  });

  it('switches to a full 5min window for the 2nd token, starting right after the 1st', () => {
    setupCall();
    useBillingStore.getState().setInitialTokens(2); // waiting on the 2nd token
    useTimerStore.setState({ elapsedSeconds: HALF_BLOCK }); // 2.5min in, right when the 2nd window opens

    render(<InfoCard />);

    expect(screen.getByText('5:00 / 5:00')).toBeDefined();
  });

  it('counts down correctly within the 2nd window and charges at 7.5min', () => {
    setupCall();
    useBillingStore.getState().setInitialTokens(2);
    useTimerStore.setState({ elapsedSeconds: HALF_BLOCK + BLOCK / 2 }); // 5min elapsed = halfway through 2nd window

    render(<InfoCard />);

    expect(screen.getByText('2:30 / 5:00')).toBeDefined();
  });

  it('reaches 0:00 exactly at 7.5 minutes (2nd token due)', () => {
    setupCall();
    useBillingStore.getState().setInitialTokens(2);
    useTimerStore.setState({ elapsedSeconds: HALF_BLOCK + BLOCK });

    render(<InfoCard />);

    expect(screen.getByText('0:00 / 5:00')).toBeDefined();
  });

  it('opens a fresh full 5min window for the 3rd token at 12.5min', () => {
    setupCall();
    useBillingStore.getState().setInitialTokens(3);
    useTimerStore.setState({ elapsedSeconds: HALF_BLOCK + BLOCK }); // 7.5min in, right when the 3rd window opens

    render(<InfoCard />);

    expect(screen.getByText('5:00 / 5:00')).toBeDefined();
  });

  it('displays the correct initialTokens count in "CONSUMO ATUAL"', () => {
    setupCall(10);
    useBillingStore.getState().setInitialTokens(3);

    render(<InfoCard />);

    expect(screen.getByText('3 Tk')).toBeDefined();
  });

  it('displays the customer balance in "Seu Saldo"', () => {
    setupCall(7);

    render(<InfoCard />);

    expect(screen.getByText('SEU SALDO:')).toBeDefined();
    expect(screen.getByText('7 Tks')).toBeDefined();
  });

  it('updates Seu Saldo when the customer balance changes in the store', () => {
    const call = setupCall(5);
    const { rerender } = render(<InfoCard />);
    expect(screen.getByText('5 Tks')).toBeDefined();

    useOnlineUsersStore.setState({ users: [buildOnlineUserState({ id: call.customerId, tokens: 4 })] });
    rerender(<InfoCard />);
    expect(screen.getByText('4 Tks')).toBeDefined();
  });

  it('shows the contracted rate based on MINUTES_PER_TOKEN', () => {
    setupCall();

    render(<InfoCard />);

    expect(screen.getByText(`1 tk / ${MINUTES_PER_TOKEN}m`)).toBeDefined();
  });

  it('hides the usage/countdown card when not in a call view', () => {
    setupCall();
    useCallViewStore.setState({ viewState: 'lobby' });

    render(<InfoCard />);

    expect(screen.queryByText('CONSUMO ATUAL')).toBeNull();
  });
});
