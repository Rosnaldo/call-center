import React from 'react';
import { Camera, CameraOff, ShieldCheck } from 'lucide-react';
import type { PermissionState } from '../../../states/devices/store.ts';

const btnBase = 'mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer';

interface CameraPermissionButtonProps {
  permission: PermissionState;
  onRequest: () => void;
}

export const CameraPermissionButton: React.FC<CameraPermissionButtonProps> = ({ permission, onRequest }) => {
  switch (permission) {
    case 'granted':
      return (
        <button type="button" className={`${btnBase} bg-emerald-600/20 border-emerald-500/30 text-emerald-400 cursor-default`} disabled>
          <Camera className="w-3.5 h-3.5 shrink-0" />Câmera Permitida
        </button>
      );
    case 'prompt':
      return (
        <button type="button" onClick={onRequest} className={`${btnBase} bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/30 text-amber-400 hover:text-amber-300`}>
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />Permitir Câmera
        </button>
      );
    case 'denied':
      return (
        <button type="button" onClick={onRequest} className={`${btnBase} bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400 hover:text-red-300`}>
          <CameraOff className="w-3.5 h-3.5 shrink-0" />Câmera Bloqueada
        </button>
      );
  }
};
