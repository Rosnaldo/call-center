import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { useBillingStore } from '../../states/stores.ts';

interface BillingCalculationModalProps {
  isAttendant?: boolean;
}

export const BillingCalculationModal: React.FC<BillingCalculationModalProps> = ({
  isAttendant = false,
}) => {
  const { t } = useTranslation();
  const isOpen = useBillingStore((s) => s.isCalculationModalOpen);
  if (!isOpen) return null;

  return (
    <div
      id="billing-calculation-modal"
      className="fixed inset-0 z-[200] bg-brand-dark/35 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="relative w-full max-w-sm bg-white border-0 rounded-[24px] shadow-[0_20px_50px_rgba(163,101,0,0.11),_0_4px_16px_rgba(163,101,0,0.05)] overflow-hidden flex flex-col p-6 items-center text-center gap-4">
        <button
          type="button"
          id="billing-calculation-modal-close"
          onClick={() => useBillingStore.getState().closeCalculationModal()}
          className="absolute top-3 right-3 p-1.5 text-brand-muted hover:text-brand-dark hover:bg-brand-panel/30 rounded-lg transition-all cursor-pointer"
          title={t('call.close') ?? undefined}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-[#ebdcb9] text-brand-ochre shadow-lg shadow-amber-500/5">
          <Loader2 className="h-7 w-7 stroke-[2.5] animate-spin" />
        </div>

        <h3 className="text-sm font-extrabold font-display text-brand-dark tracking-tight uppercase">
          {t('call.finalizingService')}
        </h3>

        <p className="text-xs text-brand-muted font-sans leading-relaxed">
          {isAttendant
            ? t('call.processingServiceSummary')
            : t('call.awaitingTokenCalculation')}
        </p>

        <div className="w-full bg-brand-panel/20 border border-brand-border/30 rounded-xl px-5 py-4 flex flex-col items-center justify-center gap-2 font-mono text-[10px] text-brand-muted">
          <span className="text-brand-ochre font-bold tracking-widest select-none animate-pulse">
            {isAttendant ? '♦ ' + t('call.processingService') : '♦ ' + t('call.processingOfficialValue')}
          </span>
        </div>
      </div>
    </div>
  );
};
