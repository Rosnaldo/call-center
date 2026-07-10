import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';

interface SettingsButtonProps {
  id?: string;
  onClick: () => void;
  disabled?: boolean;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  id = 'lobby-settings-toggle',
  onClick,
  disabled = false,
}) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={disabled}
      title={t('call.deviceSettings')}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-[#2a2d31]/50 text-slate-500 border-transparent'
          : 'bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer'
      }`}
    >
      <Settings className="w-5 h-5" />
    </button>
  );
};
