import React from 'react';
import { Video, VideoOff } from 'lucide-react';

interface CamToggleButtonProps {
  id?: string;
  isVideoOff: boolean;
  onClick: () => void;
  isCallActive?: boolean;
}

export const CamToggleButton: React.FC<CamToggleButtonProps> = ({
  id = 'lobby-cam-toggle',
  isVideoOff,
  onClick,
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      title={isVideoOff ? 'Ativar Câmera' : 'Desativar Câmera'}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border ${
        isVideoOff
          ? 'bg-red-600 hover:bg-red-700 text-white border-red-500/20 cursor-pointer active:scale-95'
          : 'bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer'
      }`}
    >
      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
    </button>
  );
};
