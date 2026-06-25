import React from 'react';
import { CallState } from '../../../states/call/state.ts';
import { useBillingStore } from '../../../states/stores.ts';

interface InfoCardProps {
  currentCall?: CallState | null;
  currentTokens: number;
  blockDurationSeconds: number;
  billingCountdown?: number;
  isInCall?: boolean;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const InfoCard: React.FC<InfoCardProps> = ({
  currentCall,
  currentTokens,
  blockDurationSeconds,
  billingCountdown,
  isInCall,
}) => {
  const initialTokens = useBillingStore((s) => s.initialTokens);

  if (!currentCall) return null;

  const pct = blockDurationSeconds > 0 && billingCountdown !== undefined
    ? (billingCountdown / blockDurationSeconds) * 100
    : 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 mb-2 select-none font-sans mr-auto w-full sm:w-auto">
      <div
        id="billing-card"
        className="bg-[#f2efe7] rounded-xl px-6 py-4 w-full sm:w-[260px] text-left shadow-none flex flex-col justify-center border-0"
      >
        <div className="text-[12px] font-mono tracking-widest text-[#a36500] uppercase font-bold mb-1">
          SESSÃO
        </div>
        <div className="text-[10px] font-mono font-bold text-brand-dark flex items-center gap-1 mt-1">
          <span>SEU SALDO:</span>
          <span className="bg-[#ebdcb9]/30 text-[#a36500] font-mono font-bold text-[9px] px-2 py-0.5 rounded-md border border-[#ebdcb9]/60">{currentTokens} {currentTokens === 1 ? 'Tk' : 'Tks'}</span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#ebdcb9]/40 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[#ebdcb9]/20 border border-[#ebdcb9]/50 px-2 py-0.5 rounded text-[8px] text-brand-muted font-mono uppercase font-semibold">
            TAXA CONTRATADA
          </div>
          <span className="font-mono text-[10px] font-bold text-[#a36500]">
            {blockDurationSeconds === 10 ? '1 tk / 10s' : '1 tk / 10m'}
          </span>
        </div>
      </div>

      {isInCall && billingCountdown !== undefined && (
        <div className="bg-[#f2efe7] rounded-xl px-6 py-4 flex-1 sm:flex-initial sm:min-w-[320px] flex flex-col justify-center shadow-none border-0">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#ebdcb9]/40 font-mono">
            <span className="text-[10px] font-mono tracking-wider text-brand-dark uppercase font-bold flex items-center gap-1.5">
              CONSUMO ATUAL
            </span>
            <span className="bg-[#ebdcb9]/30 text-[#a36500] font-mono font-bold text-[9px] px-2 py-0.5 rounded-md border border-[#ebdcb9]/60">
              {initialTokens} Tk
            </span>
          </div>

          <div className="flex justify-between items-baseline mb-2 font-mono">
            <span className="text-[9px] font-mono tracking-wider text-brand-muted uppercase">
              PRÓXIMO CONSUMO
            </span>
            <span className="font-mono text-[10px] font-bold text-[#a36500]">
              {formatTime(billingCountdown)} / {formatTime(blockDurationSeconds)}
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
