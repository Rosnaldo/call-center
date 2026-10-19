import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, Ban, ClipboardList, Download, ListChecks, Loader2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbotStore } from '../../states/stores.ts';
import type { ChatbotChoice, ChatbotMessage } from '../../states/local/chatbot/state.ts';
import type { ChatbotParams } from '../../states/local/chatbot-params/state.ts';
import { translateBotText } from '../../services/ws/chatbot-ws.ts';

// Translated on render (not on arrival), so the chat follows language changes.
const messageText = ({ text, message }: ChatbotMessage): string => (text ? translateBotText(text) : message);

// The confirmation and the offer to reuse the kept configuration show a
// button opening the summary under their text.
const hasSummaryButton = ({ text }: ChatbotMessage): boolean =>
  text?.key === 'messages.confirm' || text?.key === 'messages.askReuse';

// The offer to reuse carries the kept configuration, shown instead of the conversation's.
const summaryParamsOf = ({ text }: ChatbotMessage): ChatbotParams | undefined =>
  (text?.params?.saved as ChatbotParams | undefined) ?? undefined;

// Within this distance of the end, the board counts as "at the bottom" and
// follows new messages.
const FOLLOW_THRESHOLD_PX = 48;
// After the board reaches an edge, wheel movement pushing further is held back
// from the page for this long, so overshooting while reading doesn't jump the
// whole page. A short pause past it lets the page scroll as usual.
const EDGE_HOLD_MS = 400;

interface BoardMessageProps {
  isProcessing?: boolean;
  onAnswer?: (choice: ChatbotChoice) => void;
  onRestart?: () => void;
  onGenerateInstaller?: () => void;
  className?: string;
}

export const BoardMessage: React.FC<BoardMessageProps> = ({
  isProcessing = false,
  onAnswer,
  onRestart,
  onGenerateInstaller,
  className = '',
}) => {
  const { t } = useTranslation();
  const messages = useChatbotStore(s => s.messages);
  const botActivity = useChatbotStore(s => s.botActivity);
  const isAllowedAppsRequested = useChatbotStore(s => s.isAllowedAppsRequested);
  const openAllowedAppsModal = useChatbotStore(s => s.openAllowedAppsModal);
  const isBlockedTermsRequested = useChatbotStore(s => s.isBlockedTermsRequested);
  const openBlockedTermsModal = useChatbotStore(s => s.openBlockedTermsModal);
  const isChoiceRequested = useChatbotStore(s => s.isChoiceRequested);
  const openSummaryModal = useChatbotStore(s => s.openSummaryModal);
  const isRestartOffered = useChatbotStore(s => s.isRestartOffered);
  const containerRef = useRef<HTMLDivElement>(null);
  // Whether the user is at the end of the board. Scrolling up to reread stops
  // the following; new messages then show the "new messages" pill instead.
  const followRef = useRef(true);
  const [hasUnseen, setHasUnseen] = useState(false);
  // When the board last moved, for the edge hold below.
  const lastScrollAt = useRef(0);

  const scrollToEnd = (smooth: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    followRef.current = true;
    setHasUnseen(false);
    el.scrollTo?.({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    lastScrollAt.current = performance.now();
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_THRESHOLD_PX;
    followRef.current = atEnd;
    if (atEnd) setHasUnseen(false);
  };

  // Hold the page still for a moment when the board is at an edge and the wheel
  // keeps pushing past it, so an overshoot while scrolling the chat doesn't jump
  // the page. Native (non-passive) listener, since preventDefault needs it. Only
  // the mouse wheel / trackpad; touch keeps the browser's own edge behavior.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      const atTop = el.scrollTop <= 1;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 1;
      const pushingPastEdge = (e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop);
      if (pushingPastEdge && performance.now() - lastScrollAt.current < EDGE_HOLD_MS) {
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // New messages (and the typing indicator) are followed only when the user
  // is already at the end; a new conversation starts at the end again.
  useLayoutEffect(() => {
    if (messages.length === 0) {
      followRef.current = true;
      setHasUnseen(false);
      return;
    }
    if (followRef.current) scrollToEnd(true);
    else setHasUnseen(true);
  }, [messages, isProcessing]);

  return (
    <div className="relative">
    <div
      ref={containerRef}
      role="log"
      aria-label={t('chatbot.title')}
      onScroll={handleScroll}
      className={`w-full h-[min(480px,60vh)] min-h-[260px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#D9C9A8_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9C9A8] [&::-webkit-scrollbar-track]:bg-transparent p-3 md:p-4 space-y-1.5 text-left transition-colors ${className}`}
      style={{
        backgroundColor: '#FAF7F1',
      }}
    >
      {messages.map((msg, index) => {
        const isUser = msg.autor !== 'bot';
        // Consecutive messages from the same author share one label.
        const startsGroup = index === 0 || messages[index - 1].autor !== msg.autor;

        return (
          <div
            key={index}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${startsGroup && index > 0 ? 'pt-2' : ''}`}
          >
            {/* Indicador de remetente: 'bot' vs 'você', uma vez por grupo */}
            {startsGroup && (
              <span
                className={`text-[11px] font-mono-terminal font-semibold mb-0.5 tracking-tight select-none flex items-center gap-1 ${
                  isUser ? 'text-[#B97204] pr-1' : 'text-[#857967] pl-1'
                }`}
              >
                {!isUser && <span className="text-[9px] text-[#B97204]">◆</span>}
                {isUser ? t('chatbot.you') : t('chatbot.bot')}
              </span>
            )}

            {/* Balão da mensagem: apenas o texto, com estilos distintos */}
            <div
              className={`max-w-[90%] md:max-w-[82%] px-3 py-1.5 text-[13.5px] leading-snug whitespace-pre-wrap transition-all ${
                isUser
                  ? 'bg-[#B97204] text-white font-sans-ui rounded-xl rounded-tr-xs border border-[#A76503] shadow-[0_2px_10px_rgba(185,114,4,0.22)]'
                  : 'bg-white text-[#1E1913] font-sans-ui rounded-xl rounded-tl-xs border border-[#E4D9C4] border-l-[3px] border-l-[#B97204] shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
              }`}
            >
              <p>{messageText(msg)}</p>
            </div>

            {/* Botão da mensagem: abre a checklist de apps enquanto o bot espera a lista */}
            {msg.action === 'select_allowed_apps' && isAllowedAppsRequested && (
              <button
                type="button"
                onClick={openAllowedAppsModal}
                className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B97204] text-white font-mono-terminal text-[11px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] shadow-[0_3px_12px_-1px_rgba(185,114,4,0.38)]"
              >
                <ListChecks className="w-3.5 h-3.5" />
                {t('chatbot.selectApps')}
              </button>
            )}

            {/* Botão que abre o modal de palavras proibidas enquanto o bot as espera */}
            {msg.action === 'add_blocked_terms' && isBlockedTermsRequested && (
              <button
                type="button"
                onClick={openBlockedTermsModal}
                className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B97204] text-white font-mono-terminal text-[11px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] shadow-[0_3px_12px_-1px_rgba(185,114,4,0.38)]"
              >
                <Ban className="w-3.5 h-3.5" />
                {t('chatbot.addBlockedTerms')}
              </button>
            )}

            {/* Botão da confirmação (e da oferta de reutilizar): abre o resumo completo,
                com os apps permitidos. A margem de baixo o separa da pergunta seguinte. */}
            {hasSummaryButton(msg) && (
              <button
                type="button"
                onClick={() => openSummaryModal(summaryParamsOf(msg))}
                className="mt-1.5 mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B97204] text-white font-mono-terminal text-[11px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] shadow-[0_3px_12px_-1px_rgba(185,114,4,0.38)]"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                {t('chatbot.summaryButton')}
              </button>
            )}

            {/* Botões de escolha: respondem a pergunta do bot com o valor da opção */}
            {msg.action === 'choice' && isChoiceRequested && onAnswer && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {msg.choices?.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => onAnswer(choice)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#B97204] border border-[#B97204] font-mono-terminal text-[11px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] hover:bg-[#B97204] hover:text-white"
                  >
                    {choice.key ? t(`chatbot.${choice.key}`) : choice.label}
                  </button>
                ))}
              </div>
            )}

            {/* Botão de download do instalador, na mensagem "instalador pronto" */}
            {msg.action === 'download_installer' && msg.installerUrl && (
              <a
                href={msg.installerUrl}
                className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B97204] text-white font-mono-terminal text-[11px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] shadow-[0_3px_12px_-1px_rgba(185,114,4,0.38)] no-underline"
              >
                <Download className="w-3.5 h-3.5" />
                {t('chatbot.downloadInstaller')}
              </a>
            )}

            {/* Botões da mensagem final: gerar o instalador ou começar uma nova conversa */}
            {msg.action === 'restart' && isRestartOffered && onRestart && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onGenerateInstaller}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B97204] text-white font-mono-terminal text-[11px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] shadow-[0_3px_12px_-1px_rgba(185,114,4,0.38)] disabled:opacity-60 disabled:cursor-wait"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('chatbot.generateInstaller')}
                </button>
                <button
                  type="button"
                  onClick={onRestart}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#B97204] border border-[#B97204] font-mono-terminal text-[11px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('chatbot.generateAgain')}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Indicador de carregamento em tempo real */}
      {isProcessing && (
        <div className={`flex flex-col items-start ${messages.at(-1)?.autor === 'bot' ? '' : 'pt-2'}`}>
          {messages.at(-1)?.autor !== 'bot' && (
            <span className="text-[11px] font-mono-terminal font-semibold text-[#857967] mb-0.5 pl-1 flex items-center gap-1 select-none">
              <span className="text-[9px] text-[#B97204]">◆</span> {t('chatbot.bot')}
            </span>
          )}
          <div className="bg-white border border-[#E4D9C4] border-l-[3px] border-l-[#B97204] px-3 py-1.5 rounded-xl rounded-tl-xs text-[12px] font-mono-terminal text-[#7E7464] flex items-center gap-2 shadow-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B97204]" />
            <span>{t(botActivity === 'generating' ? 'chatbot.generating' : 'chatbot.processing')}</span>
          </div>
        </div>
      )}
    </div>

      {/* Shown when messages arrived while the user was reading further up */}
      {hasUnseen && (
        <button
          type="button"
          onClick={() => scrollToEnd(true)}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#B97204] text-white font-mono-terminal text-[11px] uppercase font-bold tracking-wider cursor-pointer shadow-[0_3px_12px_-1px_rgba(185,114,4,0.45)]"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          {t('chatbot.newMessages')}
        </button>
      )}
    </div>
  );
};
export default BoardMessage;
