import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Volume2, X, Sliders, AlertTriangle } from 'lucide-react';
import { useDaily, useLocalSessionId, useVideoTrack } from '@daily-co/daily-react';

interface MediaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCamera: string;
  setSelectedCamera: (camera: string) => void;
  selectedMic: string;
  setSelectedMic: (mic: string) => void;
  selectedSpeaker: string;
  setSelectedSpeaker: (speaker: string) => void;
  cameras: MediaDeviceInfo[];
  mics: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
}

export const MediaSettingsModal: React.FC<MediaSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedCamera,
  setSelectedCamera,
  selectedMic,
  setSelectedMic,
  selectedSpeaker,
  setSelectedSpeaker,
  cameras,
  mics,
  speakers,
}) => {
  const daily = useDaily();
  const localSessionId = useLocalSessionId();
  const videoTrack = useVideoTrack(localSessionId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundTesting, setSoundTesting] = useState(false);

  // Start camera preview via Daily when modal opens
  useEffect(() => {
    if (!isOpen || !daily) return;
    setCameraError(null);
    daily
      .startCamera({
        videoSource: selectedCamera || true,
        startAudioOff: true,
      })
      .catch((err: any) =>
        setCameraError(err.message || 'Sem permissão ou câmera ocupada'),
      );
  }, [isOpen, daily]);

  // Switch camera device when selection changes while modal is open
  useEffect(() => {
    if (!isOpen || !daily || !selectedCamera) return;
    daily
      .setInputDevicesAsync({ videoDeviceId: selectedCamera })
      .catch((err: any) => setCameraError(err.message || 'Erro ao trocar câmera'));
  }, [selectedCamera]);

  // Stop camera track when modal closes to release hardware
  useEffect(() => {
    if (isOpen) return;
    videoTrack.persistentTrack?.stop();
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [isOpen]);

  // Attach Daily video track to preview element
  useEffect(() => {
    if (!videoRef.current) return;
    const track = videoTrack.persistentTrack;
    if (track && !videoTrack.isOff) {
      videoRef.current.srcObject = new MediaStream([track]);
    } else {
      videoRef.current.srcObject = null;
    }
  }, [videoTrack.persistentTrack, videoTrack.isOff]);

  const testSpeakerSound = async () => {
    if (soundTesting) return;
    setSoundTesting(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) { setSoundTesting(false); return; }
      const ctx = new AudioCtx();
      const destination = ctx.createMediaStreamDestination();

      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playTone(523.25, ctx.currentTime, 0.4);
      playTone(659.25, ctx.currentTime + 0.15, 0.4);
      playTone(783.99, ctx.currentTime + 0.3, 0.6);

      const audio = new Audio();
      audio.srcObject = destination.stream;
      if (selectedSpeaker && (audio as any).setSinkId) {
        await (audio as any).setSinkId(selectedSpeaker).catch(() => {});
      }
      await audio.play().catch(() => {});

      setTimeout(() => { setSoundTesting(false); audio.pause(); ctx.close(); }, 1000);
    } catch (e) {
      console.error(e);
      setSoundTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="media-settings-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none font-sans">
      <div className="bg-[#17191b] w-full max-w-2xl rounded-2xl border border-[#2d3135] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222528] bg-[#1a1c1e]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Configurações de Áudio e Vídeo
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#222528] hover:bg-[#2d3135] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content panel */}
        <div className="flex-grow p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left side: Preview screen */}
            <div className="space-y-3 min-w-0">
              <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                Preview da Câmera
              </label>
              <div className="relative bg-[#0e1012] aspect-video w-full rounded-xl border border-[#222528] overflow-hidden flex items-center justify-center shadow-inner">
                {videoTrack.persistentTrack && !videoTrack.isOff ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    {cameraError ? (
                      <>
                        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
                        <span className="text-xs text-slate-400 max-w-[180px] break-words">
                          {cameraError}
                        </span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-slate-600 mb-2" />
                        <span className="text-xs text-slate-500">Câmera indisponível ou desligada</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Options dropdowns */}
            <div className="space-y-4 min-w-0">
              {/* Option 1: Camera select */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>Câmera</span>
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink"
                >
                  {cameras.length === 0 ? (
                    <option value="">Nenhuma câmera detectada</option>
                  ) : (
                    cameras.map((cam, index) => (
                      <option key={cam.deviceId || `cam-${index}`} value={cam.deviceId || ''} className="bg-[#1e2022] text-slate-100">
                        {cam.label || `Câmera ${(cam.deviceId || '').slice(0, 5) || 'Padrão'}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Option 2: Microphone select */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 shrink-0" />
                  <span>Microfone</span>
                </label>
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="w-full bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink"
                >
                  {mics.length === 0 ? (
                    <option value="">Nenhum microfone detectado</option>
                  ) : (
                    mics.map((mic, index) => (
                      <option key={mic.deviceId || `mic-${index}`} value={mic.deviceId || ''} className="bg-[#1e2022] text-slate-100">
                        {mic.label || `Microfone ${(mic.deviceId || '').slice(0, 5) || 'Padrão'}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Option 3: Speaker select */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Alto-falantes / Saída</span>
                </label>
                <div className="flex gap-2 min-w-0 items-center">
                  <select
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="flex-grow min-w-0 bg-[#1e2022] hover:bg-[#222528] border border-[#2d3135] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500/50 shadow-sm cursor-pointer transition-colors max-w-full truncate shrink"
                  >
                    {speakers.length === 0 ? (
                      <option value="">Dispositivo de áudio padrão</option>
                    ) : (
                      speakers.map((spk, index) => (
                        <option key={spk.deviceId || `spk-${index}`} value={spk.deviceId || ''} className="bg-[#1e2022] text-slate-100">
                          {spk.label || `Alto-falante ${(spk.deviceId || '').slice(0, 5) || 'Padrão'}`}
                        </option>
                      ))
                    )}
                  </select>

                  {/* Test audio output sound */}
                  <button
                    type="button"
                    onClick={testSpeakerSound}
                    disabled={soundTesting}
                    className={`px-4 py-2.5 rounded-xl flex items-center justify-center border font-semibold text-xs transition-all active:scale-95 cursor-pointer shrink-0 ${
                      soundTesting
                        ? 'bg-blue-600 border-blue-500/20 text-white animate-pulse'
                        : 'bg-[#222528] hover:bg-[#2d3135] border-[#2d3135] hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    {soundTesting ? 'Testando...' : 'Testar'}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#222528] bg-[#1a1c1e] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer transition-colors"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
