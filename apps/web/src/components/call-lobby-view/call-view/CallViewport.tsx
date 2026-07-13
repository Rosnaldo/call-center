import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Loader2, MonitorSmartphone, User } from 'lucide-react';
import { CallViewState } from './CallView.tsx';
import { CallState } from '@/src/states/shared/call/state.ts';
import { useIncomingCallStore, useCurrentUserStore, useOnlineUsersStore, useCallViewStore, useDevicesStore, useChatStore } from '../../../states/stores.ts';
import { IOnlineUser } from '@repo/shared-types';
import { VideoTile } from '../VideoTile.tsx';
import { PartnerAvatar } from '../PartnerAvatar.tsx';
import { ScreenShareTile } from '../ScreenShareTile.tsx';
import { ChatAttendment } from './ChatAttendment.tsx';
import { useParticipantIds, useScreenShare } from '@daily-co/daily-react';
import { useDevicesContext } from '../../../providers/devices.tsx';
import { useAutoEndCallTimeout } from '../../../hooks/useAutoEndCallTimeout.ts';
import { useTimerFromRemoteParticipant } from '../../../hooks/useTimerFromRemoteParticipant.ts';
import i18n from '../../../i18n.ts';



interface CallViewportProps {
  state: CallViewState;
  timerText?: string;
  attendantName?: string;
  queueCount?: number;
  currentCall?: CallState | null;
  isAttendant?: boolean;
}

const renderNoneViewport = () => (
  <div id="viewport-none" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans select-none">
    <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400 mb-4">
      <User className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
      {i18n.t('call.noServiceSelected')}
    </h3>
  </div>
);

const renderInCallInAnotherViewport = () => (
  <div id="viewport-in-call-in-another" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans select-none">
    <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400 mb-4">
      <MonitorSmartphone className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
      {i18n.t('call.activeInAnotherTabTitle')}
    </h3>
    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
      {i18n.t('call.activeInAnotherTab')}
    </p>
  </div>
);

const renderCallClosingViewport = () => (
  <div id="viewport-call-closing" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans select-none">
    <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400 mb-4">
      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
      {i18n.t('call.awaitingCallClose')}
    </h3>
  </div>
);

const renderAwaitingAttendant = (partner: IOnlineUser | undefined) => (
  <div id="viewport-awaiting-attendant" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans select-none">
    <PartnerAvatar partner={partner} size="md" pulse />
    <h3 className="text-sm font-bold text-brand-ochre tracking-wide uppercase  mt-2.5 mb-1">
      {i18n.t('call.incomingCall')}
    </h3>
    <p className="text-xs text-slate-300 font-medium select-text">
      {i18n.t('call.callerIsCalling', { name: partner?.name ?? '' })}
    </p>
    <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
      {i18n.t('call.clickAcceptCall')}
    </p>
  </div>
);

const renderAwaitingClient = (partner: IOnlineUser | undefined) => (
  <div id="viewport-awaiting-client" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans select-none">
    <PartnerAvatar partner={partner} size="md" pulse />
    <h3 className="text-sm font-bold text-brand-ochre tracking-wide uppercase mt-2.5 mb-1">
      {i18n.t('call.callStarted')}
    </h3>
    <p className="text-xs text-slate-300 font-medium select-text">
      {i18n.t('call.awaitingAnswer', { name: partner?.name ?? '' })}
    </p>
  </div>
);

const renderLobbyViewport = (attendant: IOnlineUser) => (
  <div id="viewport-lobby" className="flex flex-col items-center justify-center gap-3 p-8 text-center max-w-sm font-sans">
    <PartnerAvatar partner={attendant} size="md" fadeIn />
    <h3 className="text-sm font-semibold text-slate-100 tracking-wide mt-2.5">
      {attendant.name}
    </h3>
  </div>
);

const renderAwaitingAnswer = (attendant: IOnlineUser | null) => (
  <div id="viewport-awaiting-answer" className="flex flex-col items-center justify-center p-8 text-center max-w-sm font-sans select-none">
    <PartnerAvatar partner={attendant} size="md" pulse />
    <h3 className="text-sm font-bold text-brand-ochre tracking-wide uppercase mt-2.5 mb-1">
      {i18n.t('call.callStarted')}
    </h3>
    <p className="text-xs text-slate-300 font-medium select-text">
      {i18n.t('call.awaitingAnswer', { name: attendant?.name ?? '' })}
    </p>
  </div>
);

const ActiveVideoViewport: React.FC<{ partner: IOnlineUser | undefined }> = ({ partner }) => {
  const { t } = useTranslation();
  const cameraPermission = useDevicesStore(s => s.cameraPermission);
  const micPermission = useDevicesStore(s => s.micPermission);
  const { requestCamera, requestMicrophone } = useDevicesContext();
  const { screens } = useScreenShare();

  useEffect(() => {
    if (cameraPermission === 'prompt') requestCamera();
    if (micPermission === 'prompt') requestMicrophone();
  }, []);

  const remoteParticipantIds = useParticipantIds({ filter: "remote" });
  const id = remoteParticipantIds[0];
  useTimerFromRemoteParticipant(id);

  const activeScreen = screens[0];

  const secondsUntilAutoEnd = useAutoEndCallTimeout(id);

  if (!id && !activeScreen) {
    if (!partner || partner.status === 'disconnecting') return null;

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center font-sans select-none">
        <PartnerAvatar partner={partner} size="md" />
        <p className="text-xs text-slate-400 mt-2">{t('call.waitingToJoin')}</p>
        <p className="text-[11px] text-slate-500 mt-1">{t('call.autoEndCountdown', { seconds: secondsUntilAutoEnd })}</p>
      </div>
    );
  }

  if (activeScreen) {
    return (
      <div id="viewport-active-video" className="flex flex-col items-center w-full h-full">
        <ScreenShareTile screenVideo={activeScreen.screenVideo} />
      </div>
    );
  }

  return (
    <div id="viewport-active-video" className="flex flex-col items-center w-full h-full">
      <VideoTile sessionId={id} partner={partner} />
    </div>
  );
};

export const CallViewport: React.FC<CallViewportProps> = ({
  state,
  timerText,
  currentCall,
}) => {
  const incomingCall = useIncomingCallStore(s => s.incomingCall);
  let content: React.ReactNode = null;
  const currentUser = useCurrentUserStore(s => s.currentUser);
  const users = useOnlineUsersStore(s => s.users);
  const isChatOpen = useChatStore(s => s.isOpen);
  const chatMessages = useChatStore(s => s.messages);
  const hasUnreadMessage = useChatStore(s => s.hasUnreadMessage);

  const isReceiving = incomingCall
    ? currentUser?._id === incomingCall.attendantId
    : currentUser?._id === currentCall?.attendantId;
  const hasIncomingCall = !!incomingCall;

  const selectedAttendantId = useCallViewStore(s => s.selectedAttendantId);

  const callSource = incomingCall ?? currentCall;
  const partnerId = isReceiving ? callSource?.customerId : callSource?.attendantId;
  const partner = users.find(u => u.id === partnerId);

  const partnerName = partner?.name ?? '';
  const attendant = users.find(u => u.id === selectedAttendantId) ?? null;

  if (state === CallViewState.None) {
    content = renderNoneViewport();
  } else if (state === CallViewState.AwaitingAnswer) {
    content = renderAwaitingAnswer(attendant);
  } else if (state === CallViewState.AwaitingToAnswer && isReceiving) {
    content = renderAwaitingAttendant(partner);
  } else if (state === CallViewState.AwaitingToAnswer && !isReceiving) {
    content = renderAwaitingClient(partner);
  } else if (state === CallViewState.Lobby) {
    content = attendant ? renderLobbyViewport(attendant) : renderNoneViewport();
  } else if (state === CallViewState.InCall) {
    content = <ActiveVideoViewport partner={partner} />;
  } else if (state === CallViewState.InCallInAnother) {
    content = renderInCallInAnotherViewport();
  } else if (state === CallViewState.CallClosing) {
    content = renderCallClosingViewport();
  } else {
    content = renderNoneViewport();
  }

  let topLeftBadge: React.ReactNode = null;
  if (partnerName && state === CallViewState.Lobby && !hasIncomingCall) {
    topLeftBadge = (
      <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-slate-300 text-xs font-medium px-3.5 py-1.5 rounded-full border border-white/5 select-none font-sans shadow-md">
        {partnerName} (Preview)
      </div>
    );
  } else if (partnerName && state === CallViewState.InCall) {
    topLeftBadge = (
      <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-slate-300 text-xs font-medium px-3.5 py-1.5 rounded-full border border-white/5 select-none font-sans shadow-md">
        {partnerName}
      </div>
    );
  }

  let timerBadge: React.ReactNode = null;
  if (timerText && state === CallViewState.InCall) {
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
      {state === CallViewState.InCall && (
        <ChatAttendment
          isOpen={isChatOpen}
          onClose={() => useChatStore.getState().closeChat()}
          messages={chatMessages}
          hasUnreadMessage={hasUnreadMessage}
          onMessagesSeen={() => useChatStore.getState().markMessagesRead()}
          currentUserRole={currentUser?.role === 'attendant' ? 'attendant' : 'customer'}
          partnerName={partnerName}
          partnerAvatarUrl={partner?.avatarUrl}
          onSendMessage={(text) => useChatStore.getState().sendChatMessage(text)}
          onSendFile={(file) => useChatStore.getState().sendChatFile(file)}
        />
      )}
    </div>
  );
};
