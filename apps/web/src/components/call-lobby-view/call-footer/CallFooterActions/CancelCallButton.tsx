import React from 'react';
import { Loader2, PhoneOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CancelCallButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const CancelCallButton: React.FC<CancelCallButtonProps> = ({ onClick, isLoading = false, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      id="lobby-cancel-call"
      onClick={onClick}
      disabled={isLoading || disabled}
      className="px-6 py-3 rounded-full flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold transition-all active:scale-95 shadow-lg border border-red-500/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <PhoneOff className="w-4 h-4 fill-white" />
      )}
      <span>{t('call.cancelCall')}</span>
    </button>
  );
};
