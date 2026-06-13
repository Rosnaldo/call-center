import React from 'react';
import { Settings } from 'lucide-react';

interface SettingsButtonProps {
  id?: string;
  onClick: () => void;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  id = 'lobby-settings-toggle',
  onClick,
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      title="Configurações de Dispositivos"
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer"
    >
      <Settings className="w-5 h-5" />
    </button>
  );
};
