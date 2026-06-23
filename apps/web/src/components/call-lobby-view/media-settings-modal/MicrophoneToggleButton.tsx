import React from 'react';
import { Mic, MicOff } from 'lucide-react';

const btnBase = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer';
const btnOn = `${btnBase} bg-[#1e2022] hover:bg-[#222528] border-[#2d3135] text-slate-300 hover:text-white`;
const btnOff = `${btnBase} bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400 hover:text-red-300`;

interface MicrophoneToggleButtonProps {
  enabled: boolean;
  onToggle: () => void;
}

export const MicrophoneToggleButton: React.FC<MicrophoneToggleButtonProps> = ({ enabled, onToggle }) => {
  if (enabled) {
    return (
      <button id="is-microphone-enabled" type="button" onClick={onToggle} className={btnOn}>
        <Mic className="w-3.5 h-3.5 shrink-0" />Desabilitar Microfone
      </button>
    );
  }

  return (
    <button id="is-microphone-enabled" type="button" onClick={onToggle} className={btnOff}>
      <MicOff className="w-3.5 h-3.5 shrink-0" />Habilitar Microfone
    </button>
  );
};
