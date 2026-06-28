import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MicToggleButtonProps {
  id?: string;
  isMuted: boolean;
  onClick: () => void;
  isCallActive?: boolean;
}

export const MicToggleButton: React.FC<MicToggleButtonProps> = ({
  id = 'lobby-mic-toggle',
  isMuted,
  onClick,
}) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      title={isMuted ? t('mediaSettings.unmuteMic') : t('mediaSettings.muteMic')}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border ${
        isMuted
          ? 'bg-red-600 hover:bg-red-700 text-white border-red-500/20 cursor-pointer active:scale-95'
          : 'bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer'
      }`}
    >
      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};
