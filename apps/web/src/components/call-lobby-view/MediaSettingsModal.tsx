import React, { useEffect } from 'react';
import { Camera, CameraOff, Mic, MicOff, Volume2, X, Sliders } from 'lucide-react';
import { useDaily } from '@daily-co/daily-react';
import { useDevices } from '../../hooks/useDevices.ts';
import { useMediaTest } from '../../hooks/useMediaTest.ts';
import { useDevicesStore } from '../../states/stores.ts';

interface MediaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MediaSettingsModal: React.FC<MediaSettingsModalProps> = ({ isOpen, onClose }) => {
  const daily = useDaily();
  const {
    cameras, microphones, speakers,
    selectedCamera, selectedMicrophone, selectedSpeaker,
    setSelectedCamera, setSelectedMicrophone, setSelectedSpeaker,
  } = useDevices();

  const { videoRef, micLevel, startTest, stopTest, playTestSound, isPlayingTestSound } = useMediaTest();

  const cameraOn = useDevicesStore(s => s.cameraOn);
  const microphoneOn = useDevicesStore(s => s.microphoneOn);
  const toggleCamera = useDevicesStore(s => s.toggleCamera);
  const toggleMicrophone = useDevicesStore(s => s.toggleMicrophone);

  useEffect(() => {
    if (isOpen) {
      startTest(selectedCamera, selectedMicrophone);
    } else {
      stopTest();
    }
  }, [isOpen]);

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
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 shrink-0" /><span>Nível do Microfone</span>
                </label>
                <div className="h-2 w-full bg-[#222528] rounded-full overflow-hidden border border-[#2d3135]">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 shrink-0" /><span>Câmera</span>
                </label>
                <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  {cameras.length === 0 ? (
                    <option value="">Nenhuma câmera detectada</option>
                  ) : (
                    cameras.map((cam) => (
                      <option key={cam.deviceId} value={cam.deviceId} className="bg-[#1e2022] text-slate-100">
                        {cam.label}
                      </option>
                    ))
                  )}
                </select>
                <button type="button" onClick={() => toggleCamera(daily)}
                  className={`mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer ${
                    cameraOn
                      ? 'bg-[#1e2022] hover:bg-[#222528] border-[#2d3135] text-slate-300 hover:text-white'
                      : 'bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400 hover:text-red-300'
                  }`}>
                  {cameraOn ? <Camera className="w-3.5 h-3.5 shrink-0" /> : <CameraOff className="w-3.5 h-3.5 shrink-0" />}
                  {cameraOn ? "Desabilitar Câmera" : "Habilitar Câmera"}
                </button>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 shrink-0" /><span>Microfone</span>
                </label>
                <select value={selectedMicrophone} onChange={(e) => setSelectedMicrophone(e.target.value)}
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  {microphones.length === 0 ? (
                    <option value="">Nenhum microfone detectado</option>
                  ) : (
                    microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId} className="bg-[#1e2022] text-slate-100">
                        {mic.label}
                      </option>
                    ))
                  )}
                </select>
                <button type="button" onClick={() => toggleMicrophone(daily)}
                  className={`mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer ${
                    microphoneOn
                      ? 'bg-[#1e2022] hover:bg-[#222528] border-[#2d3135] text-slate-300 hover:text-white'
                      : 'bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400 hover:text-red-300'
                  }`}>
                  {microphoneOn ? <Mic className="w-3.5 h-3.5 shrink-0" /> : <MicOff className="w-3.5 h-3.5 shrink-0" />}
                  {microphoneOn ? "Desabilitar Microfone" : "Habilitar Microfone"}
                </button>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" /><span>Alto-falantes / Saída</span>
                </label>
                <select value={selectedSpeaker} onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  {speakers.length === 0 ? (
                    <option value="">Dispositivo de áudio padrão</option>
                  ) : (
                    speakers.map((spk) => (
                      <option key={spk.deviceId} value={spk.deviceId} className="bg-[#1e2022] text-slate-100">
                        {spk.label}
                      </option>
                    ))
                  )}
                </select>
                <button type="button" onClick={() => playTestSound(selectedSpeaker)} disabled={isPlayingTestSound}
                  className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  {isPlayingTestSound ? "Reproduzindo..." : "Testar Som"}
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
