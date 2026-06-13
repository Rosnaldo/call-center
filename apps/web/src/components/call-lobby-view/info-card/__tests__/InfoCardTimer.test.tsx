import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoCard } from '../InfoCard.tsx';
import { buildCall } from '../../../../__tests__/builders.ts';

const BLOCK = 600;

const countdown = (tokensCharged: number, elapsed: number) =>
  Math.max(0, tokensCharged * BLOCK - elapsed);

describe('InfoCard – billing countdown timer', () => {
  it('shows the full block duration at t=0', () => {
    render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 1 })}
        currentTokens={5}
        blockDurationSeconds={BLOCK}
        billingCountdown={countdown(1, 0)}
        isInCall
      />
    );
    expect(screen.getByText('10:00 / 10:00')).toBeDefined();
  });

  it('decrements the countdown as elapsed increases', () => {
    const call = buildCall({ tokensCharged: 1 });
    const { rerender } = render(
      <InfoCard currentCall={call} currentTokens={5} blockDurationSeconds={BLOCK} billingCountdown={countdown(1, 1)} isInCall />
    );
    expect(screen.getByText('9:59 / 10:00')).toBeDefined();

    rerender(<InfoCard currentCall={call} currentTokens={5} blockDurationSeconds={BLOCK} billingCountdown={countdown(1, 2)} isInCall />);
    expect(screen.getByText('9:58 / 10:00')).toBeDefined();

    rerender(<InfoCard currentCall={call} currentTokens={5} blockDurationSeconds={BLOCK} billingCountdown={countdown(1, 3)} isInCall />);
    expect(screen.getByText('9:57 / 10:00')).toBeDefined();
  });

  it('reaches 0:00 when the full block duration elapses', () => {
    render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 1 })}
        currentTokens={5}
        blockDurationSeconds={BLOCK}
        billingCountdown={countdown(1, 600)}
        isInCall
      />
    );
    expect(screen.getByText('0:00 / 10:00')).toBeDefined();
  });

  it('progress bar starts at 100% width at t=0', () => {
    const { container } = render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 1 })}
        currentTokens={5}
        blockDurationSeconds={BLOCK}
        billingCountdown={600}
        isInCall
      />
    );
    const bar = container.querySelector('[style*="width"]') as HTMLElement;
    expect(bar?.style.width).toBe('100%');
  });

  it('progress bar is at 50% width halfway through the block', () => {
    const { container } = render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 1 })}
        currentTokens={5}
        blockDurationSeconds={BLOCK}
        billingCountdown={300}
        isInCall
      />
    );
    const bar = container.querySelector('[style*="width"]') as HTMLElement;
    expect(bar?.style.width).toBe('50%');
  });

  it('progress bar reaches 0% width at the end of the block', () => {
    const { container } = render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 1 })}
        currentTokens={5}
        blockDurationSeconds={BLOCK}
        billingCountdown={0}
        isInCall
      />
    );
    const bar = container.querySelector('[style*="width"]') as HTMLElement;
    expect(bar?.style.width).toBe('0%');
  });

  it('shows full countdown at the start of the second token cycle (tokensCharged=2)', () => {
    render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 2 })}
        currentTokens={5}
        blockDurationSeconds={BLOCK}
        billingCountdown={countdown(2, 600)}
        isInCall
      />
    );
    expect(screen.getByText('10:00 / 10:00')).toBeDefined();
  });

  it('counts down correctly within the second token cycle', () => {
    render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 2 })}
        currentTokens={5}
        blockDurationSeconds={BLOCK}
        billingCountdown={countdown(2, 900)}
        isInCall
      />
    );
    expect(screen.getByText('5:00 / 10:00')).toBeDefined();
  });

  it('displays the correct tokensCharged count in "CONSUMO ATUAL"', () => {
    render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 3 })}
        currentTokens={10}
        blockDurationSeconds={BLOCK}
        billingCountdown={countdown(3, 0)}
        isInCall
      />
    );
    expect(screen.getByText('3 Tk')).toBeDefined();
  });

  it('displays the customer balance in "Seu Saldo"', () => {
    render(
      <InfoCard
        currentCall={buildCall({ tokensCharged: 1 })}
        currentTokens={7}
        blockDurationSeconds={BLOCK}
        billingCountdown={countdown(1, 0)}
        isInCall
      />
    );
    expect(screen.getByText('SEU SALDO:')).toBeDefined();
    expect(screen.getByText('7 Tks')).toBeDefined();
  });

  it('updates Seu Saldo when currentTokens prop changes between renders', () => {
    const call = buildCall({ tokensCharged: 1 });
    const { rerender } = render(
      <InfoCard currentCall={call} currentTokens={5} blockDurationSeconds={BLOCK} billingCountdown={countdown(1, 0)} isInCall />
    );
    expect(screen.getByText('5 Tks')).toBeDefined();

    rerender(<InfoCard currentCall={call} currentTokens={4} blockDurationSeconds={BLOCK} billingCountdown={countdown(1, 0)} isInCall />);
    expect(screen.getByText('4 Tks')).toBeDefined();
  });
});
