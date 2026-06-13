import React from 'react';
import { ScreenShare, ScreenShareOff } from 'lucide-react';

interface ScreenShareToggleButtonProps {
  id?: string;
  isCallActive: boolean;
  isScreenSharing: boolean;
  onClick: () => void;
}

export const ScreenShareToggleButton: React.FC<ScreenShareToggleButtonProps> = ({
  id = 'lobby-screenshare-toggle',
  isCallActive,
  isScreenSharing,
  onClick,
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={!isCallActive}
      title={isScreenSharing ? 'Parar Compartilhamento de Tela' : 'Compartilhar Tela'}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border ${
        !isCallActive
          ? 'opacity-40 cursor-not-allowed bg-[#2a2d31]/50 text-slate-500 border-transparent'
          : isScreenSharing
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/20 cursor-pointer active:scale-95'
          : 'bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer'
      }`}
    >
      {isScreenSharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
    </button>
  );
};
