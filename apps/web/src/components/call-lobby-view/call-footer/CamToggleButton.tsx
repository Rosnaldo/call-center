import React from 'react';
import { useTranslation } from 'react-i18next';
import { Video, VideoOff } from 'lucide-react';

interface CamToggleButtonProps {
  id?: string;
  isVideoOff: boolean;
  onClick: () => void;
  isCallActive?: boolean;
  disabled?: boolean;
}

export const CamToggleButton: React.FC<CamToggleButtonProps> = ({
  id = 'lobby-cam-toggle',
  isVideoOff,
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
      title={isVideoOff ? t('call.enableCamera') : t('call.disableCamera')}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-[#2a2d31]/50 text-slate-500 border-transparent'
          : isVideoOff
          ? 'bg-red-600 hover:bg-red-700 text-white border-red-500/20 cursor-pointer active:scale-95'
          : 'bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer'
      }`}
    >
      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
    </button>
  );
};
