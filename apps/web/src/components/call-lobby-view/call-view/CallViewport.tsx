import React from 'react';
import { ScreenShare, Clock, User } from 'lucide-react';
import { CallViewState } from './CallView.tsx';
import { CallState } from '@/src/states/call/state.ts';
import { useIncomingCallStore, useCurrentUserStore, useOnlineUsersStore, useCallViewStore } from '../../../states/stores.ts';
import { IOnlineUser } from '@repo/shared-types';
import { VideoTile } from '../VideoTile.tsx';
import { PartnerAvatar } from '../PartnerAvatar.tsx';
import { useParticipantIds } from '@daily-co/daily-react';
import { useDevicesContext } from '../../../providers/devices.tsx';
import { getInitials } from '@/src/utils/helpers.ts';

interface CallViewportProps {
  state: CallViewState;
  isScreenSharing: boolean;
  timerText?: string;
  attendantName?: string;
  queueCount?: number;
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

const renderPartnerAvatar = (
  partnerName: string,
  partnerInitials: string,
  avatarUrl?: string,
  extraClass = ''
): React.ReactNode =>
  avatarUrl ? (
    <img
      src={avatarUrl}
      alt={partnerName}
      className={`w-20 h-20 rounded-full object-cover border-2 border-brand-ochre/50 mb-3 shadow-none bg-slate-800 ${extraClass}`}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className={`w-20 h-20 rounded-full bg-brand-ochre/15 border-2 border-brand-ochre/35 flex items-center justify-center text-brand-ochre font-bold text-2xl mb-3 shadow-none select-none ${extraClass}`}>
      {partnerInitials}
    </div>
  );

const renderAwaitingAttendant = (
  partnerName: string,
  partnerInitials: string,
  avatarUrl?: string
) => (
  <div id="viewport-awaiting-attendant" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in select-none">
    <div className="relative">
      {renderPartnerAvatar(partnerName, partnerInitials, avatarUrl, 'animate-pulse')}
      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 border-2 border-[#0e1012] rounded-full animate-pulse" />
    </div>
    <h3 className="text-sm font-bold text-brand-ochre tracking-wide uppercase mb-1">
      Chamada Recebida
    </h3>
    <p className="text-xs text-slate-300 font-medium select-text">
      {partnerName} está tentando ligar...
    </p>
    <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
      Clique no botão verde <strong className="text-emerald-400 font-semibold">"Atender Chamada"</strong> abaixo para iniciar a videoconferência.
    </p>
  </div>
);

const renderAwaitingClient = (
  partnerName: string,
  partnerInitials: string,
  avatarUrl?: string
) => (
  <div id="viewport-awaiting-client" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in select-none">
    {renderPartnerAvatar(partnerName, partnerInitials, avatarUrl, 'animate-pulse')}
    <h3 className="text-sm font-bold text-brand-ochre tracking-wide uppercase mb-1 animate-pulse">
      Chamada Iniciada
    </h3>
    <p className="text-xs text-slate-300 font-medium select-text">
      Aguardando que {partnerName} atenda a ligação...
    </p>
  </div>
);

const renderInterruptedAttendant = (
  partnerName: string,
  partnerInitials: string,
  avatarUrl?: string
) => (
  <div id="viewport-interrupted-attendant" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in select-none">
    <div className="relative">
      {renderPartnerAvatar(partnerName, partnerInitials, avatarUrl, 'animate-pulse')}
      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 border-2 border-[#0e1012] rounded-full animate-pulse" />
    </div>
    <h3 className="text-sm font-bold text-amber-500 tracking-wide uppercase mb-1">
      Conexão Interrompida
    </h3>
    <p className="text-xs text-slate-300 font-medium select-text">
      Aguardando {partnerName} retornar à ligação...
    </p>
    <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
      Timer e cobrança pausados. Aguarde o retorno do cliente ou finalize a sessão se preferir.
    </p>
  </div>
);

const renderInterruptedClient = (
  partnerName: string,
  partnerInitials: string,
  avatarUrl?: string
) => (
  <div id="viewport-interrupted-client" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in select-none">
    {renderPartnerAvatar(partnerName, partnerInitials, avatarUrl, 'animate-pulse')}
    <h3 className="text-sm font-bold text-amber-500 tracking-wide uppercase mb-1 animate-pulse">
      Conexão Interrompida
    </h3>
    <p className="text-xs text-slate-300 font-medium select-text">
      Aguardando o atendente {partnerName} retornar...
    </p>
    <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
      Timer e cobrança pausados. Aguarde o retorno do atendente ou finalize a sessão se preferir.
    </p>
  </div>
);

const renderLobbyViewport = (
  attendant: IOnlineUser,
) => {
  const nameToDisplay = attendant.name;

  let lobbyVisual: React.ReactNode = (
    <div className="w-16 h-16 rounded-full bg-brand-ochre/15 border-2 border-brand-ochre/35 flex items-center justify-center text-brand-ochre font-bold text-lg mb-3 shadow-none select-none">
      {getInitials(attendant.name)}
    </div>
  );

  if (attendant.avatarUrl) {
    lobbyVisual = (
      <img
        src={attendant.avatarUrl}
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

const renderAwaitingAnswer = (attendant: IOnlineUser | null) => (
  <div id="viewport-awaiting-answer" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans animate-fade-in select-none">
    {attendant?.avatarUrl ? (
      <img
        src={attendant.avatarUrl}
        alt={attendant.name}
        className="w-20 h-20 rounded-full object-cover border-2 border-brand-ochre/50 mb-3 shadow-none bg-slate-800 animate-pulse"
        referrerPolicy="no-referrer"
      />
    ) : (
      <div className="w-20 h-20 rounded-full bg-brand-ochre/15 border-2 border-brand-ochre/35 flex items-center justify-center text-brand-ochre font-bold text-2xl mb-3 animate-pulse">
        {attendant ? getInitials(attendant.name) : 'VC'}
      </div>
    )}
    <h3 className="text-sm font-bold text-brand-ochre tracking-wide uppercase mb-1 animate-pulse">
      Chamada Iniciada
    </h3>
    <p className="text-xs text-slate-300 font-medium select-text">
      Aguardando que {attendant?.name ?? ''} atenda a ligação...
    </p>
  </div>
);

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

const ActiveVideoViewport: React.FC<{ partner: IOnlineUser | undefined }> = ({ partner }) => {
  const remoteParticipantIds = useParticipantIds({ filter: "remote" });
  const { cameraOn } = useDevicesContext();
  const id = remoteParticipantIds[0];

  return (
    <div id="viewport-active-video" className="flex flex-col items-center">
      {cameraOn ? <VideoTile sessionId={id} /> : <PartnerAvatar partner={partner} />}
    </div>
  );
};

export const CallViewport: React.FC<CallViewportProps> = ({
  state,
  isScreenSharing,
  timerText,
  currentCall,
}) => {
  const incomingCall = useIncomingCallStore(s => s.incomingCall);
  let content: React.ReactNode = null;
  const currentUser = useCurrentUserStore(s => s.currentUser);
  const users = useOnlineUsersStore(s => s.users);

  const isReceiving = incomingCall
    ? currentUser?.id === incomingCall.attendantId
    : currentUser?.id === currentCall?.attendantId;
  const hasIncomingCall = !!incomingCall;

  const selectedAttendantId = useCallViewStore(s => s.selectedAttendantId);

  const callSource = incomingCall ?? currentCall;
  const partnerId = isReceiving ? callSource?.customerId : callSource?.attendantId;
  const partner = users.find(u => u.id === partnerId);

  const partnerName = partner?.name ?? '';
  const partnerInitials = getInitials(partnerName);
  const partinerAvatarUrl = partner?.avatarUrl;
  const attendant = users.find(u => u.id === selectedAttendantId) ?? null;

  if (state === CallViewState.None) {
    content = renderNoneViewport();
  } else if (state === CallViewState.AwaitingAnswer) {
    content = renderAwaitingAnswer(attendant);
  } else if (state === CallViewState.CallInterrupted && isReceiving) {
    content = renderInterruptedAttendant(partnerName, partnerInitials, partinerAvatarUrl);
  } else if (state === CallViewState.CallInterrupted && !isReceiving) {
    content = renderInterruptedClient(partnerName, partnerInitials, partinerAvatarUrl);
  } else if (hasIncomingCall && isReceiving) {
    content = renderAwaitingAttendant(partnerName, partnerInitials, partinerAvatarUrl);
  } else if (hasIncomingCall && !isReceiving) {
    content = renderAwaitingClient(partnerName, partnerInitials, partinerAvatarUrl);
  } else if (state === CallViewState.Lobby) {
    content = attendant ? renderLobbyViewport(attendant) : renderNoneViewport();
  } else if (isScreenSharing) {
    content = renderScreenSharingViewport();
  } else {
    content = <ActiveVideoViewport partner={partner} />;
  }

  let topLeftBadge: React.ReactNode = null;
  if (state === CallViewState.Lobby && !hasIncomingCall) {
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

  const muteBadge: React.ReactNode = null;

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
