import React from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const btnBase = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer';
const btnOn = `${btnBase} bg-[#1e2022] hover:bg-[#222528] border-[#2d3135] text-slate-300 hover:text-white`;
const btnOff = `${btnBase} bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400 hover:text-red-300`;

interface CameraToggleButtonProps {
  enabled: boolean;
  onToggle: () => void;
}

export const CameraToggleButton: React.FC<CameraToggleButtonProps> = ({ enabled, onToggle }) => {
  const { t } = useTranslation();
  if (enabled) {
    return (
      <button id="is-camera-enabled" type="button" onClick={onToggle} className={btnOn}>
        <Camera className="w-3.5 h-3.5 shrink-0" />{t('mediaSettings.disableCamera')}
      </button>
    );
  }

  return (
    <button id="is-camera-enabled" type="button" onClick={onToggle} className={btnOff}>
      <CameraOff className="w-3.5 h-3.5 shrink-0" />{t('mediaSettings.enableCamera')}
    </button>
  );
};
