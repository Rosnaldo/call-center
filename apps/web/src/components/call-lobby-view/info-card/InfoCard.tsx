import React from 'react';
import { useTranslation } from 'react-i18next';
import { MINUTES_PER_TOKEN } from '@repo/shared-types';
import { useBillingStore, useCallStore, useCurrentUserStore, useOnlineUsersStore, useTimerStore } from '../../../states/stores.ts';
import { useCallViewState } from '../../../hooks/useCallViewState.ts';

const BLOCK_DURATION_SECONDS = MINUTES_PER_TOKEN * 60;
const HALF_BLOCK_DURATION_SECONDS = BLOCK_DURATION_SECONDS / 2;

const formatTime = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const InfoCard: React.FC = () => {
  const { t } = useTranslation();
  const currentCall = useCallStore((s) => s.call);
  const viewState = useCallViewState();
  const users = useOnlineUsersStore((s) => s.users);
  const tokensCharged = useBillingStore((s) => s.initialTokens);
  const elapsedSeconds = useTimerStore((s) => s.elapsedSeconds);
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  if (!currentCall) return null;

  const isInCall = viewState === 'in-call';
  // The lookup is always the customer's balance — showing it as "SEU SALDO"
  // (your balance) is only correct for the customer themselves, never for
  // the attendant/admin viewing the same call.
  const showBalance = currentUser?.role === 'customer';
  const currentTokens = users.find((u) => u.id === currentCall.customerId)?.tokens ?? 0;

  // Mirrors computeTokensToBeCharged's half-cycle rule: the Nth token is due
  // at N*BLOCK - BLOCK/2 elapsed seconds (1st at 2.5min, 2nd at 7.5min, ...).
  // tokensCharged (from useBillingStore, driven by useBillingTimer) counts
  // tokens already charged (0-based, same as CallState.tokensToBeCharged), so
  // the next charge is the (tokensCharged+1)-th token.
  const nextChargeAtSeconds = (tokensCharged + 1) * BLOCK_DURATION_SECONDS - HALF_BLOCK_DURATION_SECONDS;
  const previousChargeAtSeconds = Math.max(0, tokensCharged * BLOCK_DURATION_SECONDS - HALF_BLOCK_DURATION_SECONDS);
  const windowSeconds = nextChargeAtSeconds - previousChargeAtSeconds;
  const billingCountdown = Math.max(0, Math.ceil(nextChargeAtSeconds - elapsedSeconds));

  const pct = windowSeconds > 0 ? (billingCountdown / windowSeconds) * 100 : 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 mb-2 select-none font-sans mr-auto w-full sm:w-auto">
      <div
        id="billing-card"
        className="bg-[#f2efe7] rounded-xl px-6 py-4 w-full sm:w-[260px] text-left shadow-none flex flex-col justify-center border-0"
      >
        <div className="text-[12px] font-mono tracking-widest text-[#a36500] uppercase font-bold mb-1">
          {t('infoCard.session')}
        </div>
        {showBalance && (
          <div className="text-[10px] font-mono font-bold text-brand-dark flex items-center gap-1 mt-1">
            <span>{t('infoCard.yourBalance')}</span>
            <span className="bg-[#ebdcb9]/30 text-[#a36500] font-mono font-bold text-[9px] px-2 py-0.5 rounded-md border border-[#ebdcb9]/60">{currentTokens} {currentTokens === 1 ? 'tk' : 'tks'}</span>
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-[#ebdcb9]/40 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[#ebdcb9]/20 border border-[#ebdcb9]/50 px-2 py-0.5 rounded text-[8px] text-brand-muted font-mono uppercase font-semibold">
            {t('infoCard.contractedRate')}
          </div>
          <span className="font-mono text-[10px] font-bold text-[#a36500]">
            1 tk / {MINUTES_PER_TOKEN} min
          </span>
        </div>
      </div>

      {isInCall && (
        <div className="bg-[#f2efe7] rounded-xl px-6 py-4 flex-1 sm:flex-initial sm:min-w-[320px] flex flex-col justify-center shadow-none border-0">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#ebdcb9]/40 font-mono">
            <span className="text-[10px] font-mono tracking-wider text-brand-dark uppercase font-bold flex items-center gap-1.5">
              {t('infoCard.currentUsage')}
            </span>
            <span className="bg-[#ebdcb9]/30 text-[#a36500] font-mono font-bold text-[9px] px-2 py-0.5 rounded-md border border-[#ebdcb9]/60">
              {tokensCharged} tk
            </span>
          </div>

          <div className="flex justify-between items-baseline mb-2 font-mono">
            <span className="text-[9px] font-mono tracking-wider text-brand-muted uppercase">
              {t('infoCard.nextCharge')}
            </span>
            <span className="font-mono text-[10px] font-bold text-[#a36500]">
              {formatTime(billingCountdown)} / {formatTime(windowSeconds)}
            </span>
          </div>

          <div className="w-full bg-[#ebdcb9]/30 h-[6px] rounded-full overflow-hidden">
            <div
              style={{ width: `${pct}%` }}
              className="bg-[#a36500] h-full rounded-full transition-all duration-1000 ease-linear shadow-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
