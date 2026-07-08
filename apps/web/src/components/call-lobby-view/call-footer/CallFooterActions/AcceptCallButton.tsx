import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Phone } from 'lucide-react';

interface AcceptCallButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export const AcceptCallButton: React.FC<AcceptCallButtonProps> = ({ onClick, isLoading = false }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      id="lobby-accept-call"
      onClick={onClick}
      disabled={isLoading}
      className="px-6 py-3 rounded-full flex items-center gap-2 text-white font-semibold transition-all active:scale-95 shadow-lg border cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 disabled:animate-none animate-pulse bg-emerald-600 hover:bg-emerald-700 border-emerald-500/20"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Phone className="w-4 h-4 fill-white" />
      )}
      <span>{t('call.acceptCall')}</span>
    </button>
  );
};
