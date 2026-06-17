import React, { useState, useEffect, useRef } from 'react';
import { useCallViewStore } from '../states/store.ts';
import { useCallStore } from '../../../states/call/store.ts';
import { useCurrentUserStore } from '../../../states/current-user/store.ts';
import { useOnlineUsersStore } from '../../../states/online-users/store.ts';
import { InfoCard } from '../info-card/InfoCard.tsx';
import { MediaSettingsModal } from '../MediaSettingsModal.tsx';
import { BillingCalculationModal } from '../BillingCalculationModal.tsx';
import { BillingSummaryModal } from '../BillingSummaryModal.tsx';
import { ConfirmCloseCallModal } from '../ConfirmCloseCallModal.tsx';
import { CallView, CallViewState } from './CallView.tsx';
import { CallState } from '@/src/states/call/state.ts';
import { playNotificationChime } from '../../../utils/helpers.ts';

function showSystemNotification(title: string, body: string, roomUrl?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: 'https://ssl.gstatic.com/meet/images/iso/meet_32px_b44081efbc99c518.png',
        requireInteraction: true,
        tag: 'turn-alert'
      });
      n.onclick = () => {
        window.focus();
        if (roomUrl) window.open(roomUrl, '_blank');
        n.close();
      };
    } catch (e) {
      console.error('Failed to create system notification:', e);
    }
  }
}

interface CallLobbyViewProps {
  onHangUp: (attendantId: string, callId?: string, byAttendant?: boolean) => void;
}

export const CallLobbyView: React.FC<CallLobbyViewProps> = ({ onHangUp }) => {
  const call = useCallStore((s) => s.call);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((s) => s.users);
  const selectedAttendantId = useCallViewStore((s) => s.selectedAttendantId);
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    devices,
    setDevices,
    selectedCamera,
    setSelectedCamera,
    selectedMic,
    setSelectedMic,
    selectedSpeaker,
    setSelectedSpeaker,
    soundTesting,
    setSoundTesting,
    cameraStream,
    setCameraStream,
    cameraError,
    setCameraError,
  } = useCallViewStore();

  const selectedAttendant = selectedAttendantId ? users.find(u => u.id === selectedAttendantId) : null;
  const draftCall: CallState | undefined = (selectedAttendantId && selectedAttendant && !call && currentUser)
    ? {
        id: `draft-call-${selectedAttendantId}`,
        customerId: currentUser.id,
        customerName: currentUser.name,
        attendantId: selectedAttendantId,
        attendantName: selectedAttendant.name,
        roomUrl: '',
        status: 'draft-lobby' as any,
        wasAnswered: false,
        tokensCharged: 0,
      }
    : undefined;

  const currentCall = call ?? draftCall;
  const isAttendant = currentCall ? currentUser?.id === currentCall.attendantId : false;

  // Local UI state (not stored in Zustand)
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [billingCountdown, setBillingCountdown] = useState(10);
  const [activationTimes, setActivationTimes] = useState<Record<string, number>>({});

  const fastBilling = false;
  const blockDurationSeconds = fastBilling ? 10 : 600;

  const isCallActive = currentCall
    ? (currentCall.status === 'active' || currentCall.status === 'call-interrupteded')
    : false;

  const prevStatusRef = useRef(currentCall?.status);
  useEffect(() => {
    if (prevStatusRef.current === 'awaiting-answer' && currentCall?.status === 'active') {
      try {
        const targetPartner = currentUser?.role === 'customer'
          ? currentCall.attendantName
          : currentCall.customerName;
        showSystemNotification(
          'Chamada Conectada!',
          `Sua chamada com ${targetPartner} está ativa agora.`,
          currentCall.roomUrl
        );
      } catch (err) {
        console.warn('Failed to notify call start:', err);
      }
    }
    prevStatusRef.current = currentCall?.status;
  }, [currentCall?.status, currentUser?.role, currentCall?.attendantName, currentCall?.customerName, currentCall?.roomUrl]);

  const handleStartCall = () => {
    if (!currentCall) return;
    const now = Date.now();

    if (!isAttendant) {
      try { playNotificationChime(); } catch (err) { console.warn('Failed to play start sound:', err); }
    }

    if (currentCall.status === ('draft-lobby' as any) || currentCall.id.startsWith('draft-call-')) {
      useCallStore.getState().initiateCall(currentCall.customerId, currentCall.attendantId);
      useCallViewStore.getState().setSelectedAttendantId(null);
      return;
    }

    if (currentCall.status === 'call-interrupteded') {
      useCallStore.getState().updateCall(currentCall.id, { status: 'active' });
      return;
    }

    if (isAttendant) {
      setActivationTimes(prev => ({ ...prev, [currentCall.id]: now }));
      useCallStore.getState().updateCall(currentCall.id, { status: 'active', startedAt: now });
    } else {
      useCallStore.getState().updateCall(currentCall.id, { status: 'awaiting-answer' });
    }
  };

  // Elapsed timer
  useEffect(() => {
    if (!currentCall) {
      setSeconds(0);
      return;
    }
    if (currentCall.status !== 'active') {
      // Freeze display during interruption without resetting
      return;
    }
    const start = activationTimes[currentCall.id] || currentCall.startedAt || Date.now();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const clamped = diff >= 0 ? diff : 0;
      setSeconds(clamped);
      secondsRef.current = clamped;
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [currentCall?.id, currentCall?.status, isCallActive, activationTimes, currentCall?.startedAt]);

  // Billing countdown
  useEffect(() => {
    if (!currentCall) {
      setBillingCountdown(blockDurationSeconds);
      return;
    }
    if (currentCall.status !== 'active') {
      // Freeze countdown during interruption
      return;
    }
    const start = activationTimes[currentCall.id] || currentCall.startedAt || Date.now();
    const tickBilling = () => {
      const elapsedSinceStart = Date.now() - start;
      const tokensChargedCount = currentCall.tokensCharged || 1;
      const nextChargeDelay = tokensChargedCount * blockDurationSeconds * 1000;
      const remainingMs = nextChargeDelay - elapsedSinceStart;
      const remaining = Math.ceil(remainingMs / 1000);
      setBillingCountdown(remaining >= 0 ? remaining : 0);
    };
    tickBilling();
    const interval = setInterval(tickBilling, 1000);
    return () => clearInterval(interval);
  }, [currentCall?.id, currentCall?.status, isCallActive, activationTimes, currentCall?.tokensCharged, currentCall?.startedAt, blockDurationSeconds]);

  // Confirm close modal
  const endedByAttendantRef = useRef(false);
  const endedByCustomerRef = useRef(false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [pendingHangUpParams, setPendingHangUpParams] = useState<{ attendantId: string; callId?: string } | null>(null);

  const handleHangUp = (attendantId: string, callId?: string) => {
    const call = callId ? useCallStore.getState().call : currentCall;
    if (call && !call.wasAnswered && call.status === 'awaiting-answer') {
      useCallStore.getState().cancelCall(call.id);
      return;
    }
    if (isCallActive || isAttendant) {
      setPendingHangUpParams({ attendantId, callId });
      setIsConfirmCloseOpen(true);
    } else {
      onHangUp(attendantId, callId, isAttendant);
    }
  };

  const handleConfirmClose = () => {
    if (isAttendant) endedByAttendantRef.current = true;
    else endedByCustomerRef.current = true;

    if (pendingHangUpParams) {
      onHangUp(pendingHangUpParams.attendantId, pendingHangUpParams.callId, isAttendant);
    } else if (currentCall) {
      onHangUp(currentCall.attendantId, currentCall.id, isAttendant);
    }
    setPendingHangUpParams(null);
    setIsConfirmCloseOpen(false);
  };

  const handleCancelClose = () => {
    setPendingHangUpParams(null);
    setIsConfirmCloseOpen(false);
  };

  // Fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const nextVal = !isFullscreen;
    setIsFullscreen(nextVal);
    if (!containerRef.current) return;
    const doc = document as any;
    const element = containerRef.current as any;
    try {
      const isCurrent = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      if (nextVal && !isCurrent) {
        if (element.requestFullscreen) await element.requestFullscreen();
        else if (element.webkitRequestFullscreen) await element.webkitRequestFullscreen();
        else if (element.mozRequestFullScreen) await element.mozRequestFullScreen();
        else if (element.msRequestFullscreen) await element.msRequestFullscreen();
      } else if (!nextVal && isCurrent) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  const exitFullscreen = async () => {
    setIsFullscreen(false);
    try {
      const doc = document as any;
      const isCurrent = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      if (isCurrent) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Failed to exit fullscreen:', err);
    }
  };

  // Camera / device settings
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isSettingsOpen) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      return;
    }

    let active = true;
    setCameraError(null);

    const startCamera = async () => {
      const isMockDevice = selectedCamera === 'built-in-cam' || selectedCamera === 'external-cam' || selectedCamera === 'virtual-cam';
      if (isMockDevice) {
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        return;
      }
      try {
        if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedCamera } } });
        if (active) {
          setCameraStream(stream);
          if (videoRef.current) videoRef.current.srcObject = stream;
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err: any) {
        console.warn('Could not launch camera device stream:', err);
        if (active) setCameraError(err.message || 'Sem permissão ou câmera ocupada');
      }
    };

    startCamera();
    return () => { active = false; };
  }, [isSettingsOpen, selectedCamera]);

  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream;
  }, [cameraStream, isSettingsOpen]);

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(track => track.stop()); };
  }, [cameraStream]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(deviceInfos => {
          setDevices(deviceInfos);
          const videoIn = deviceInfos.filter(d => d.kind === 'videoinput');
          const audioIn = deviceInfos.filter(d => d.kind === 'audioinput');
          const audioOut = deviceInfos.filter(d => d.kind === 'audiooutput');
          if (videoIn.length > 0) setSelectedCamera(videoIn[0].deviceId);
          if (audioIn.length > 0) setSelectedMic(audioIn[0].deviceId);
          if (audioOut.length > 0) setSelectedSpeaker(audioOut[0].deviceId);
        })
        .catch(err => console.warn('Erro ao obter os dispositivos de mídia:', err));
    }
  }, []);

  const testSpeakerSound = () => {
    if (soundTesting) return;
    setSoundTesting(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) { setSoundTesting(false); return; }
      const ctx = new AudioCtx();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(523.25, ctx.currentTime, 0.4);
      playTone(659.25, ctx.currentTime + 0.15, 0.4);
      playTone(783.99, ctx.currentTime + 0.3, 0.6);
      setTimeout(() => { setSoundTesting(false); ctx.close(); }, 1000);
    } catch (e) {
      console.error(e);
      setSoundTesting(false);
    }
  };

  const cameraDevicesList = devices.filter(d => d.kind === 'videoinput');
  const micDevicesList = devices.filter(d => d.kind === 'audioinput');
  const speakerDevicesList = devices.filter(d => d.kind === 'audiooutput');

  const cameras = (cameraDevicesList.length > 0 ? cameraDevicesList : [
    { deviceId: 'built-in-cam', label: '🎥 Câmera FaceTime HD Integrada', kind: 'videoinput', groupId: '' },
    { deviceId: 'external-cam', label: '🎥 Webcam USB Externa 4K', kind: 'videoinput', groupId: '' },
    { deviceId: 'virtual-cam', label: '🎥 OBS Virtual Camera', kind: 'videoinput', groupId: '' }
  ]) as any as MediaDeviceInfo[];

  const mics = (micDevicesList.length > 0 ? micDevicesList : [
    { deviceId: 'built-in-mic', label: '🎙️ Microfone Integrado (MacBook Pro)', kind: 'audioinput', groupId: '' },
    { deviceId: 'headset-mic', label: '🎧 Microfone de Fone Bluetooth (Hands-Free)', kind: 'audioinput', groupId: '' },
    { deviceId: 'usb-condenser', label: '🎙️ Røde NT-USB Condenser Mic', kind: 'audioinput', groupId: '' }
  ]) as any as MediaDeviceInfo[];

  const speakers = (speakerDevicesList.length > 0 ? speakerDevicesList : [
    { deviceId: 'built-in-spk', label: '🔊 Alto-falantes de Sistema (Integrados)', kind: 'audiooutput', groupId: '' },
    { deviceId: 'headset-spk', label: '🎧 Fones AirPods Pro (Estéreo)', kind: 'audiooutput', groupId: '' },
    { deviceId: 'hdmi-output', label: '🖥️ Monitor DisplayPort / Saída HDMI', kind: 'audiooutput', groupId: '' }
  ]) as any as MediaDeviceInfo[];

  // Billing summary
  const [completedCallSummary, setCompletedCallSummary] = useState<CallState | null>(null);
  const [isCalculatingTokens, setIsCalculatingTokens] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const secondsRef = useRef(0);

  const isCallActiveRef = useRef(isCallActive);
  const lastCallRef = useRef<CallState | null>(null);

  if (currentCall && isCallActive) lastCallRef.current = currentCall;

  useEffect(() => {
    const wasActive = isCallActiveRef.current;
    isCallActiveRef.current = isCallActive;

    if (wasActive && !isCallActive && lastCallRef.current) {
      exitFullscreen();
      setCallDurationSeconds(secondsRef.current);

      const endedCallId = lastCallRef.current.id;
      const endedCall = lastCallRef.current;
      lastCallRef.current = null;

      endedByAttendantRef.current = false;
      endedByCustomerRef.current = false;

      setIsCalculatingTokens(true);

      const timeoutId = setTimeout(() => {
        const storeCall = useCallStore.getState().call;
        const finalCall = storeCall?.id === endedCallId && storeCall.status === 'completed'
          ? storeCall
          : null;
        setCompletedCallSummary(finalCall ?? { ...endedCall, status: 'completed' });
        setIsCalculatingTokens(false);
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [isCallActive]);

  useEffect(() => {
    setCompletedCallSummary(null);
    setIsCalculatingTokens(false);
  }, [currentUser?.id]);

  const customerUser = currentCall ? users.find(u => u.id === currentCall.customerId) : null;
  const currentTokens = customerUser?.tokens ?? 0;

  const partnerName = currentCall ? (isAttendant ? currentCall.customerName : currentCall.attendantName) : '';

  const getInitials = (name: string): string => {
    if (!name) return 'VC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const partnerInitials = getInitials(partnerName);

  const getCallViewState = (): CallViewState => {
    if (!currentCall) return CallViewState.None;
    return isCallActive ? CallViewState.InCall : CallViewState.Lobby;
  };
  const viewState = getCallViewState();

  const attendantName = currentCall?.attendantName || '';
  const partnerUser = currentCall
    ? users.find(u => u.id === (isAttendant ? currentCall.customerId : currentCall.attendantId))
    : null;
  const attendantAvatarUrl = partnerUser?.avatarUrl || '';

  const formatTimer = (totSeconds: number) => {
    const mins = Math.floor(totSeconds / 60);
    const secs = totSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="call-lobby-view"
      className="bg-white text-brand-dark p-6 relative border border-brand-border transition-all duration-300 rounded-3xl overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-brand-border-dark pb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-brand-ochre rounded-full" />
          <h4 className="text-[10px] font-bold font-mono tracking-wider text-brand-dark uppercase">YOUR SANDBOX</h4>
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-5 mt-6">

        <InfoCard
          currentCall={currentCall}
          currentTokens={currentTokens}
          blockDurationSeconds={blockDurationSeconds}
          billingCountdown={billingCountdown}
          isInCall={viewState === CallViewState.InCall}
        />

        <div ref={containerRef} className={isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen bg-[#0c0d0e]' : 'relative'}>
          <CallView
            state={viewState}
            isScreenSharing={isScreenSharing}
            isVideoOff={isVideoOff}
            isMuted={isMuted}
            partnerName={partnerName}
            partnerInitials={partnerInitials}
            setIsMuted={setIsMuted}
            setIsVideoOff={setIsVideoOff}
            setIsScreenSharing={setIsScreenSharing}
            setIsSettingsOpen={setIsSettingsOpen}
            isFullscreen={isFullscreen}
            toggleFullscreen={toggleFullscreen}
            handleStartCall={handleStartCall}
            onHangUp={handleHangUp}
            currentCall={currentCall}
            timerText={isCallActive ? formatTimer(seconds) : undefined}
            attendantName={attendantName}
            attendantAvatarUrl={attendantAvatarUrl}
            isAttendant={isAttendant}
          />

          <MediaSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            selectedMic={selectedMic}
            setSelectedMic={setSelectedMic}
            selectedSpeaker={selectedSpeaker}
            setSelectedSpeaker={setSelectedSpeaker}
            cameras={cameras}
            mics={mics}
            speakers={speakers}
            cameraStream={cameraStream}
            cameraError={cameraError}
            soundTesting={soundTesting}
            testSpeakerSound={testSpeakerSound}
            videoRef={videoRef}
          />

          <BillingCalculationModal isOpen={isCalculatingTokens} isAttendant={currentUser?.role === 'attendant'} />

          <BillingSummaryModal
            isOpen={!!completedCallSummary}
            completedCallSummary={completedCallSummary}
            currentUser={currentUser}
            callDurationSeconds={callDurationSeconds}
            onClose={() => setCompletedCallSummary(null)}
          />

          <ConfirmCloseCallModal
            isOpen={isConfirmCloseOpen}
            onConfirm={handleConfirmClose}
            onCancel={handleCancelClose}
            isAttendant={isAttendant}
          />
        </div>

      </div>
    </div>
  );
};
