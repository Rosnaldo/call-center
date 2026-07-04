import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Check } from 'lucide-react';
import { useBillingStore, useCurrentUserStore } from '../../states/stores.ts';

export const BillingSummaryModal: React.FC = () => {
  const { t } = useTranslation();
  const initialTokens = useBillingStore((s) => s.initialTokens);
  const completedCallSummary = useBillingStore((s) => s.completedCallSummary);
  const closeSummaryModal = useBillingStore((s) => s.closeSummaryModal);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  if (!completedCallSummary) return null;

  const callDurationSeconds = Math.floor(completedCallSummary.accumulatedMs / 1000);
  const mins = Math.floor(callDurationSeconds / 60);
  const secs = callDurationSeconds % 60;
  const durationText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const partnerName = currentUser?.role === 'customer'
    ? completedCallSummary.attendantName
    : completedCallSummary.customerName;

  return (
    <div
      id="billing-summary-modal"
      className="fixed inset-0 z-[200] bg-brand-dark/35 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="w-full max-w-sm bg-white border-0 rounded-[24px] shadow-[0_20px_50px_rgba(163,101,0,0.11),_0_4px_16px_rgba(163,101,0,0.05)] overflow-hidden flex flex-col p-6 items-center text-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shadow-lg shadow-emerald-500/5">
          <Check className="h-7 w-7 stroke-[2.5]" />
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-10 animate-ping" />
        </div>

        <h3 className="text-sm font-extrabold font-sans text-brand-dark tracking-tight uppercase">
          {t('call.serviceCompleted')}
        </h3>

        <p className="text-xs text-brand-muted font-sans leading-relaxed">
          {currentUser?.role === 'attendant'
            ? <Trans i18nKey="call.attendantServiceEnded" values={{ name: partnerName }} components={{ 1: <span className="text-brand-dark font-extrabold" /> }} />
            : <Trans i18nKey="call.customerCallEnded" values={{ name: partnerName }} components={{ 1: <span className="text-brand-dark font-extrabold" /> }} />
          }
        </p>

        <div className="bg-[#f2efe7] rounded-xl px-5 py-4 w-full flex flex-col gap-3 font-sans border border-brand-border/30">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-brand-muted uppercase font-bold tracking-wider">
              {currentUser?.role === 'attendant' ? t('call.tokensBilled') : t('call.totalCost')}
            </span>
            <span className="font-extrabold text-[#a36500] font-mono uppercase bg-[#ebdcb9]/40 border border-[#ebdcb9]/60 px-2.5 py-1 rounded-lg text-[9px] leading-none">
              {currentUser?.role === 'attendant' ? t('call.received') : t('call.billed')}
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1.5 py-1">
            <span className="text-3xl font-black text-brand-dark">
              {initialTokens}
            </span>
            <span className="text-xs font-bold text-brand-muted">
              {initialTokens === 1 ? t('call.token') : t('call.tokens')}
            </span>
          </div>

          <div className="border-t border-[#ebdcb9]/40 pt-2.5 flex justify-between items-center text-[10px] text-brand-muted">
            <span>{t('call.callDuration')}</span>
            <span className="font-mono text-brand-dark font-bold">
              {durationText}
            </span>
          </div>
        </div>

        <button
          id="close-summary-btn"
          onClick={closeSummaryModal}
          className="w-full justify-center px-4 py-2.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white transition-all font-mono tracking-wide text-[10px] rounded-full uppercase flex items-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(163,101,0,0.12)] font-extrabold"
        >
          {t('call.okUnderstood')}
        </button>
      </div>
    </div>
  );
};
