import React from 'react';
import { Camera, CameraOff, Mic, MicOff, Volume2, X, Sliders } from 'lucide-react';
import type { DailyCall } from '@daily-co/daily-js';

const btnBase = 'mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer';
const btnDefault = `${btnBase} bg-[#1e2022] hover:bg-[#222528] border-[#2d3135] text-slate-300 hover:text-white`;
const btnDanger = `${btnBase} bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400 hover:text-red-300`;

interface CameraToggleButtonProps {
  blocked: boolean;
  enabled: boolean;
  daily: DailyCall | null;
  onRequestPermission: () => void;
  onToggle: (daily: DailyCall | null) => void;
}

const CameraToggleButton: React.FC<CameraToggleButtonProps> = ({ blocked, enabled, daily, onRequestPermission, onToggle }) => {
  const state = blocked ? 'blocked' : enabled ? 'on' : 'off';

  switch (state) {
    case 'blocked':
      return (
        <button id="is-camera-enabled" type="button" onClick={onRequestPermission} className={btnDanger}>
          <CameraOff className="w-3.5 h-3.5 shrink-0" />Câmera Bloqueada — Permitir
        </button>
      );
    case 'on':
      return (
        <button id="is-camera-enabled" type="button" onClick={() => onToggle(daily)} className={btnDefault}>
          <Camera className="w-3.5 h-3.5 shrink-0" />Desabilitar Câmera
        </button>
      );
    case 'off':
      return (
        <button id="is-camera-enabled" type="button" onClick={() => onToggle(daily)} className={btnDanger}>
          <CameraOff className="w-3.5 h-3.5 shrink-0" />Habilitar Câmera
        </button>
      );
  }
};

interface MicrophoneToggleButtonProps {
  blocked: boolean;
  enabled: boolean;
  daily: DailyCall | null;
  onRequestPermission: () => void;
  onToggle: (daily: DailyCall | null) => void;
}

const MicrophoneToggleButton: React.FC<MicrophoneToggleButtonProps> = ({ blocked, enabled, daily, onRequestPermission, onToggle }) => {
  const state = blocked ? 'blocked' : enabled ? 'on' : 'off';

  switch (state) {
    case 'blocked':
      return (
        <button id="is-microphone-enabled" type="button" onClick={onRequestPermission} className={btnDanger}>
          <MicOff className="w-3.5 h-3.5 shrink-0" />Microfone Bloqueado — Permitir
        </button>
      );
    case 'on':
      return (
        <button id="is-microphone-enabled" type="button" onClick={() => onToggle(daily)} className={btnDefault}>
          <Mic className="w-3.5 h-3.5 shrink-0" />Desabilitar Microfone
        </button>
      );
    case 'off':
      return (
        <button id="is-microphone-enabled" type="button" onClick={() => onToggle(daily)} className={btnDanger}>
          <MicOff className="w-3.5 h-3.5 shrink-0" />Habilitar Microfone
        </button>
      );
  }
};

interface MediaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MediaSettingsModal: React.FC<MediaSettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div id="media-settings-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none font-sans">
      <div className="bg-[#17191b] w-full max-w-2xl rounded-2xl border border-[#2d3135] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222528] bg-[#1a1c1e]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Configurações de Áudio e Vídeo
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-[#222528] hover:bg-[#2d3135] text-slate-400 hover:text-white transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-grow p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-3 min-w-0">
              <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                Preview da Câmera
              </label>
              <div className="relative bg-[#0e1012] aspect-video w-full rounded-xl border border-[#222528] overflow-hidden flex items-center justify-center shadow-inner">
                <video autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 shrink-0" /><span>Nível do Microfone</span>
                </label>
                <div className="h-2 w-full bg-[#222528] rounded-full overflow-hidden border border-[#2d3135]">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                    style={{ width: '0%' }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 shrink-0" /><span>Câmera</span>
                </label>
                <select
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  <option value="">Nenhuma câmera detectada</option>
                </select>
                <CameraToggleButton blocked={false} enabled={false} daily={null} onRequestPermission={() => {}} onToggle={() => {}} />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 shrink-0" /><span>Microfone</span>
                </label>
                <select
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  <option value="">Nenhum microfone detectado</option>
                </select>
                <MicrophoneToggleButton blocked={false} enabled={false} daily={null} onRequestPermission={() => {}} onToggle={() => {}} />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" /><span>Alto-falantes / Saída</span>
                </label>
                <select
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  <option value="">Dispositivo de áudio padrão</option>
                </select>
                <button type="button" disabled
                  className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  Testar Som
                </button>
              </div>

            </div>

          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#222528] bg-[#1a1c1e] flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md cursor-pointer transition-colors">
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
