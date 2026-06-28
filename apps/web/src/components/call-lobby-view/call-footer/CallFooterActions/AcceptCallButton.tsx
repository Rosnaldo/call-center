import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';

interface AcceptCallButtonProps {
  onClick: () => void;
}

export const AcceptCallButton: React.FC<AcceptCallButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      id="lobby-accept-call"
      onClick={onClick}
      className="px-6 py-3 rounded-full flex items-center gap-2 text-white font-semibold transition-all active:scale-95 shadow-lg border cursor-pointer animate-pulse bg-emerald-600 hover:bg-emerald-700 border-emerald-500/20"
    >
      <Phone className="w-4 h-4 fill-white" />
      <span>{t('call.acceptCall')}</span>
    </button>
  );
};
