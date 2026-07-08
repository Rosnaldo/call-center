import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface ConfirmCloseCallModalProps {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmCloseCallModal: React.FC<ConfirmCloseCallModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div
      id="confirm-close-call-modal"
      className="fixed inset-0 z-[200] bg-brand-dark/35 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        id="confirm-close-call-card"
        className="w-full max-w-md bg-white border-0 rounded-[24px] shadow-[0_20px_50px_rgba(163,101,0,0.11),_0_4px_16px_rgba(163,101,0,0.05)] overflow-hidden flex flex-col p-6 items-center text-center gap-4"
      >
        <h4 className="text-sm font-extrabold font-display text-brand-dark tracking-tight uppercase">
          {t('call.endCall')}
        </h4>

        <div className="text-xs text-brand-muted font-sans p-4 bg-brand-panel/20 leading-relaxed rounded-xl border border-brand-border/30 w-full text-center">
          {t('call.endCallWarning')}
        </div>

        <div className="flex items-center justify-between w-full mt-2 gap-4">
          <button
            id="cancel-close-call-btn"
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2 bg-white hover:bg-brand-canvas border border-[#ebdcb9] text-brand-muted hover:text-brand-dark transition-all font-mono tracking-wide text-[10px] rounded-full uppercase cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 font-semibold"
          >
            {t('call.cancel')}
          </button>

          <button
            id="confirm-close-call-btn"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-4 py-2 bg-brand-ochre hover:bg-brand-ochre-hover text-white transition-all font-mono tracking-wide text-[10px] rounded-full uppercase flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 shadow-[0_2px_8px_rgba(163,101,0,0.12)] font-extrabold"
          >
            {isConfirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('call.endCallConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
