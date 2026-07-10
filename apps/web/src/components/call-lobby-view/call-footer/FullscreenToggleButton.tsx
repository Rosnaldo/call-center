import React from 'react';
import { Maximize, Minimize } from 'lucide-react';

interface FullscreenToggleButtonProps {
  id?: string;
  isFullscreen: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const FullscreenToggleButton: React.FC<FullscreenToggleButtonProps> = ({
  id = 'lobby-fullscreen-toggle',
  isFullscreen,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={disabled}
      title={isFullscreen ? 'Voltar a tela ao normal' : 'Expandir a tela'}
      aria-label={isFullscreen ? 'Voltar a tela ao normal' : 'Expandir a tela'}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-[#2a2d31]/50 text-slate-500 border-transparent'
          : 'bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer'
      }`}
    >
      {isFullscreen ? (
        <Minimize className="w-5 h-5" />
      ) : (
        <Maximize className="w-5 h-5" />
      )}
    </button>
  );
};
