import React, { useState, useCallback, useEffect } from 'react';
import { Camera, Mic, Volume2, X, Sliders } from 'lucide-react';
import { CameraToggleButton } from './CameraToggleButton.tsx';
import { MicrophoneToggleButton } from './MicrophoneToggleButton.tsx';
import { CameraPermissionButton } from './CameraPermissionButton.tsx';
import { MicrophonePermissionButton } from './MicrophonePermissionButton.tsx';
import { useDevicesContext } from '../../../providers/devices.tsx';
import { useMediaTest } from '../../../hooks/useMediaTest.ts';
import { useSyncEnabledDevices } from '../../../hooks/useSyncEnabledDevices.ts';

interface MediaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MediaSettingsModal: React.FC<MediaSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    detectedCameras, detectedMicrophones, detectedSpeakers,
    camera, microphone, speaker,
    setCamera, setMicrophone, setSpeaker,
    cameraPermission, micPermission,
    requestCamera, requestMicrophone,
    cameraOn, microphoneOn,
    toggleCameraDailyco, toggleMicrophoneDailyco,
  } = useDevicesContext();

  useSyncEnabledDevices();

  const { videoRef, micLevel, startTest, stopTest } = useMediaTest({
    cameraPermission,
    micPermission,
    cameraId: camera,
    micId: microphone,
    cameraOn,
    microphoneOn,
  });

  useEffect(() => {
    if (isOpen) {
      startTest();
    } else {
      stopTest();
    }
  }, [isOpen, startTest, stopTest]);

  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);

  const playTestSound = useCallback(async (speakerId: string) => {
    setIsPlayingTestSound(true);
    try {
      const options: AudioContextOptions & { sinkId?: string } = {};
      if (speakerId) options.sinkId = speakerId;
      const ctx = new AudioContext(options);

      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.4 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.4);
        osc.stop(ctx.currentTime + i * 0.4 + 0.4);
      });

      setTimeout(() => {
        ctx.close().catch(() => {});
        setIsPlayingTestSound(false);
      }, 1500);
    } catch {
      setIsPlayingTestSound(false);
    }
  }, []);

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

              <div className="flex items-center gap-2 pt-1">
                <CameraToggleButton enabled={cameraOn} onToggle={toggleCameraDailyco} />
                <MicrophoneToggleButton enabled={microphoneOn} onToggle={toggleMicrophoneDailyco} />
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 shrink-0" /><span>Câmera</span>
                </label>
                <select value={camera} onChange={(e) => setCamera(e.target.value)}
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  {detectedCameras.length === 0 ? (
                    <option value="">Nenhuma câmera detectada</option>
                  ) : (
                    detectedCameras.map((cam) => (
                      <option key={cam.deviceId} value={cam.deviceId} className="bg-[#1e2022] text-slate-100">
                        {cam.label}
                      </option>
                    ))
                  )}
                </select>
                <CameraPermissionButton permission={cameraPermission} onRequest={requestCamera} />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 shrink-0" /><span>Microfone</span>
                </label>
                <select value={microphone} onChange={(e) => setMicrophone(e.target.value)}
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  {detectedMicrophones.length === 0 ? (
                    <option value="">Nenhum microfone detectado</option>
                  ) : (
                    detectedMicrophones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId} className="bg-[#1e2022] text-slate-100">
                        {mic.label}
                      </option>
                    ))
                  )}
                </select>
                <MicrophonePermissionButton permission={micPermission} onRequest={requestMicrophone} />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" /><span>Alto-falantes / Saída</span>
                </label>
                <select value={speaker} onChange={(e) => setSpeaker(e.target.value)}
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink">
                  {detectedSpeakers.length === 0 ? (
                    <option value="">Dispositivo de áudio padrão</option>
                  ) : (
                    detectedSpeakers.map((spk) => (
                      <option key={spk.deviceId} value={spk.deviceId} className="bg-[#1e2022] text-slate-100">
                        {spk.label}
                      </option>
                    ))
                  )}
                </select>
                <button type="button" onClick={() => playTestSound(speaker)} disabled={isPlayingTestSound}
                  className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  {isPlayingTestSound ? 'Reproduzindo...' : 'Testar Som'}
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
