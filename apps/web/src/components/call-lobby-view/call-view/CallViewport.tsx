import React from 'react';
import { ScreenShare, VideoOff, MicOff, Clock, User } from 'lucide-react';
import { CallViewState } from './CallView.tsx';
import { CallState } from '@/src/states/call/state.ts';

interface CallViewportProps {
  state: CallViewState;
  isScreenSharing: boolean;
  isVideoOff: boolean;
  isMuted: boolean;
  partnerName: string;
  partnerInitials: string;
  timerText?: string;
  attendantName?: string;
  queueCount?: number;
  attendantAvatarUrl?: string;
  currentCall?: CallState;
  isAttendant?: boolean;
}

const renderNoneViewport = () => (
  <div id="viewport-none" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in select-none">
    <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
      <User className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
      Nenhum Atendimento Selecionado
    </h3>
  </div>
);

const renderAwaitingAttendant = (
  status: string,
  partnerName: string,
  partnerInitials: string,
  attendantAvatarUrl?: string
) => {
  const avatarOrInitials: React.ReactNode = attendantAvatarUrl ? (
    <img
      src={attendantAvatarUrl}
      alt={partnerName}
      className="w-20 h-20 rounded-full object-cover border-2 border-brand-ochre/50 mb-3 shadow-none bg-slate-800 animate-pulse"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="w-20 h-20 rounded-full bg-brand-ochre/15 border-2 border-brand-ochre/35 flex items-center justify-center text-brand-ochre font-bold text-2xl mb-3 shadow-none select-none animate-pulse">
      {partnerInitials}
    </div>
  );

  const statusInfo: React.ReactNode = status === 'call-interrupteded' ? (
    <>
      <h3 className="text-sm font-bold text-amber-500 tracking-wide uppercase mb-1">
        Conexão Interrompida
      </h3>
      <p className="text-xs text-slate-300 font-medium select-text">
        Aguardando {partnerName} retornar à ligação...
      </p>
      <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
        Timer e cobrança pausados. Aguarde o retorno do cliente ou finalize a sessão se preferir.
      </p>
    </>
  ) : (
    <>
      <h3 className="text-sm font-bold text-brand-ochre tracking-wide uppercase mb-1">
        Chamada Recebida
      </h3>
      <p className="text-xs text-slate-300 font-medium select-text">
        {partnerName} está tentando ligar...
      </p>
      <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
        Clique no botão verde <strong className="text-emerald-400 font-semibold">"Atender Chamada"</strong> abaixo para iniciar a videoconferência.
      </p>
    </>
  );

  return (
    <div id="viewport-awaiting" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in select-none">
      <div className="relative">
        {avatarOrInitials}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 border-2 border-[#0e1012] rounded-full animate-pulse" />
      </div>
      {statusInfo}
    </div>
  );
};

const renderAwaitingClient = (
  status: string,
  partnerName: string,
  partnerInitials: string,
  attendantAvatarUrl?: string
) => {
  const avatarOrInitials: React.ReactNode = attendantAvatarUrl ? (
    <img
      src={attendantAvatarUrl}
      alt={partnerName}
      className="w-20 h-20 rounded-full object-cover border-2 border-brand-ochre/50 mb-3 shadow-none bg-slate-800 animate-pulse"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="w-20 h-20 rounded-full bg-brand-ochre/15 border-2 border-brand-ochre/35 flex items-center justify-center text-brand-ochre font-bold text-2xl mb-3 shadow-none select-none animate-pulse">
      {partnerInitials}
    </div>
  );

  const statusInfo: React.ReactNode = status === 'call-interrupteded' ? (
    <>
      <h3 className="text-sm font-bold text-amber-500 tracking-wide uppercase mb-1 animate-pulse">
        Conexão Interrompida
      </h3>
      <p className="text-xs text-slate-300 font-medium select-text">
        Aguardando o atendente {partnerName} retornar...
      </p>
      <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
        Timer e cobrança pausados. Aguarde o retorno do atendente ou finalize a sessão se preferir.
      </p>
    </>
  ) : (
    <>
      <h3 className="text-sm font-bold text-brand-ochre tracking-wide uppercase mb-1 animate-pulse">
        Chamada Iniciada
      </h3>
      <p className="text-xs text-slate-300 font-medium select-text">
        Aguardando que {partnerName} atenda a ligação...
      </p>
    </>
  );

  return (
    <div id="viewport-awaiting" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in select-none">
      <div className="relative">
        {avatarOrInitials}
      </div>
      {statusInfo}
    </div>
  );
};

const renderLobbyViewport = (
  isVideoOff: boolean,
  partnerName: string,
  partnerInitials: string,
  attendantName?: string,
  attendantAvatarUrl?: string
) => {
  const nameToDisplay = attendantName || partnerName;

  let lobbyVisual: React.ReactNode = (
    <div className="w-16 h-16 rounded-full bg-brand-ochre/15 border-2 border-brand-ochre/35 flex items-center justify-center text-brand-ochre font-bold text-lg mb-3 shadow-none select-none">
      {partnerInitials}
    </div>
  );
  if (isVideoOff) {
    lobbyVisual = (
      <div id="viewport-video-off-lobby" className="flex flex-col items-center text-slate-500 mb-3">
        <div className="w-16 h-16 rounded-full bg-[#1b1d1f] border border-dashed border-[#2d3135] flex items-center justify-center">
          <VideoOff className="w-5 h-5 text-slate-600 animate-pulse" />
        </div>
        <span className="text-[11px] font-medium mt-2 text-slate-500 tracking-wider uppercase">Câmera Desativada</span>
      </div>
    );
  } else if (attendantAvatarUrl) {
    lobbyVisual = (
      <img
        src={attendantAvatarUrl}
        alt={nameToDisplay}
        className="w-16 h-16 rounded-full object-cover border-2 border-brand-ochre/30 mb-3 shadow-none"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div id="viewport-lobby" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in">
      {lobbyVisual}
      <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
        {nameToDisplay}
      </h3>
    </div>
  );
};

const renderScreenSharingViewport = () => (
  <div id="viewport-sharing" className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
      <ScreenShare className="w-10 h-10" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200 tracking-wide">
      Sua Tela está Sendo Compartilhada
    </h3>
    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
      Os outros participantes da chamada conseguem visualizar seu desktop em tempo real. Pressione o botão de compartilhamento novamente para interromper.
    </p>
    <div className="mt-4 px-3 py-1 bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-[10px] uppercase font-bold tracking-widest rounded-full animate-pulse">
      Compartilhando ao vivo
    </div>
  </div>
);

const renderActiveVideoViewport = (
  partnerName: string,
  partnerInitials: string,
  attendantAvatarUrl?: string
) => {
  const videoVisual: React.ReactNode = attendantAvatarUrl ? (
    <img
      src={attendantAvatarUrl}
      alt={partnerName}
      className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-none border-2 border-slate-700/40 transform hover:scale-105 transition duration-300 select-none bg-slate-800"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-brand-ochre/15 flex items-center justify-center text-brand-ochre font-bold text-3xl md:text-4xl shadow-none border-2 border-slate-700/40 tracking-wide transform hover:scale-105 transition duration-300 select-none">
      {partnerInitials}
    </div>
  );

  return (
    <div id="viewport-active-video" className="flex flex-col items-center">
      {videoVisual}
    </div>
  );
};

export const CallViewport: React.FC<CallViewportProps> = ({
  state,
  isScreenSharing,
  isVideoOff,
  isMuted,
  partnerName,
  partnerInitials,
  timerText,
  attendantName,
  attendantAvatarUrl,
  currentCall,
  isAttendant,
}) => {
  let content: React.ReactNode = null;

  const currentCallStatus = currentCall?.status || '';
  const isAwaitingOrInterrupted = currentCallStatus === 'awaiting-answer' || currentCallStatus === 'call-interrupteded';

  if (state === CallViewState.None) {
    content = renderNoneViewport();
  } else if (isAwaitingOrInterrupted && isAttendant) {
    content = renderAwaitingAttendant(currentCallStatus, partnerName, partnerInitials, attendantAvatarUrl);
  } else if (isAwaitingOrInterrupted && !isAttendant) {
    content = renderAwaitingClient(currentCallStatus, partnerName, partnerInitials, attendantAvatarUrl);
  } else if (state === CallViewState.Lobby) {
    content = renderLobbyViewport(isVideoOff, partnerName, partnerInitials, attendantName, attendantAvatarUrl);
  } else if (isScreenSharing) {
    content = renderScreenSharingViewport();
  } else {
    content = renderActiveVideoViewport(partnerName, partnerInitials, attendantAvatarUrl);
  }

  let topLeftBadge: React.ReactNode = null;
  if (state === CallViewState.Lobby && !isAwaitingOrInterrupted) {
    topLeftBadge = (
      <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-slate-300 text-xs font-medium px-3.5 py-1.5 rounded-full border border-white/5 select-none font-sans shadow-md">
        {partnerName} (Preview)
      </div>
    );
  } else if (state === CallViewState.InCall) {
    const statusText = isScreenSharing ? ' (Tela Compartilhada)' : '';
    topLeftBadge = (
      <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-slate-300 text-xs font-medium px-3.5 py-1.5 rounded-full border border-white/5 select-none font-sans shadow-md">
        {partnerName}{statusText}
      </div>
    );
  }

  let timerBadge: React.ReactNode = null;
  if (timerText) {
    timerBadge = (
      <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs font-mono text-slate-200 shadow-md">
        <Clock className="w-3.5 h-3.5 text-brand-ochre" />
        <span>{timerText}</span>
      </div>
    );
  }

  let muteBadge: React.ReactNode = null;
  if (state === CallViewState.InCall && isMuted) {
    muteBadge = (
      <div className="bg-red-600/90 text-white text-[10px] uppercase font-bold px-2.5 py-1.5 rounded-full border border-red-500/20 shadow-md flex items-center gap-1.5 backdrop-blur-sm">
        <MicOff className="w-3 h-3 text-white" />
        <span>Mudo</span>
      </div>
    );
  }

  return (
    <div
      id="call-viewport"
      className="flex-grow w-full flex items-center justify-center relative bg-[#0e1012] min-h-[290px] md:min-h-[360px]"
    >
      {content}
      {topLeftBadge}
      <div className="absolute bottom-3 left-4 text-[9px] font-mono tracking-widest uppercase text-white/30 select-none font-bold z-10">
        DAILY.CO SECURE MEETING
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        {timerBadge}
        {muteBadge}
      </div>
    </div>
  );
};
