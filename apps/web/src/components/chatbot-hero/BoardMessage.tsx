import React, { useRef } from 'react';
import { Download, ListChecks, Loader2, RotateCcw } from 'lucide-react';
import { useChatbotStore } from '../../states/stores.ts';

interface BoardMessageProps {
  isProcessing?: boolean;
  onAnswer?: (text: string) => void;
  onRestart?: () => void;
  className?: string;
}

export const BoardMessage: React.FC<BoardMessageProps> = ({
  isProcessing = false,
  onAnswer,
  onRestart,
  className = '',
}) => {
  const messages = useChatbotStore(s => s.messages);
  const isAllowedAppsRequested = useChatbotStore(s => s.isAllowedAppsRequested);
  const openAllowedAppsModal = useChatbotStore(s => s.openAllowedAppsModal);
  const isChoiceRequested = useChatbotStore(s => s.isChoiceRequested);
  const isRestartOffered = useChatbotStore(s => s.isRestartOffered);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={`w-full h-[330px] md:h-[360px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-4 md:p-5 space-y-3.5 text-left transition-colors ${className}`}
      style={{
        backgroundColor: '#FAF7F1',
      }}
    >
      {messages.map((msg, index) => {
        const isUser = msg.autor !== 'bot';

        return (
          <div
            key={index}
            className={`flex flex-col ${
              isUser ? 'items-end' : 'items-start'
            }`}
          >
            {/* Indicador de remetente: 'bot' vs 'você' */}
            <span
              className={`text-[11px] font-mono-terminal font-semibold mb-1 tracking-tight select-none flex items-center gap-1 ${
                isUser ? 'text-[#B97204] pr-1' : 'text-[#857967] pl-1'
              }`}
            >
              {!isUser && <span className="text-[9px] text-[#B97204]">◆</span>}
              {isUser ? 'você' : 'bot'}
            </span>

            {/* Balão da mensagem: apenas o texto, com estilos distintos */}
            <div
              className={`max-w-[85%] md:max-w-[78%] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap transition-all ${
                isUser
                  ? 'bg-[#B97204] text-white font-sans-ui rounded-2xl rounded-tr-xs border border-[#A76503] shadow-[0_2px_10px_rgba(185,114,4,0.22)]'
                  : 'bg-white text-[#1E1913] font-sans-ui rounded-2xl rounded-tl-xs border border-[#E4D9C4] border-l-[3px] border-l-[#B97204] shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
              }`}
            >
              <p>{msg.message}</p>
            </div>

            {/* Botão da mensagem: abre a checklist de apps enquanto o bot espera a lista */}
            {msg.action === 'select_allowed_apps' && isAllowedAppsRequested && (
              <button
                type="button"
                onClick={openAllowedAppsModal}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#B97204] text-white font-mono-terminal text-[12px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] shadow-[0_3px_12px_-1px_rgba(185,114,4,0.38)]"
              >
                <ListChecks className="w-4 h-4" />
                Selecionar apps
              </button>
            )}

            {/* Botões de escolha: respondem a pergunta do bot com o valor da opção */}
            {msg.action === 'choice' && isChoiceRequested && onAnswer && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.choices?.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => onAnswer(choice.value)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-white text-[#B97204] border border-[#B97204] font-mono-terminal text-[12px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] hover:bg-[#B97204] hover:text-white"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            )}

            {/* Botões da mensagem final: gerar o instalador ou começar uma nova conversa */}
            {msg.action === 'restart' && isRestartOffered && onRestart && (
              <div className="mt-2 flex flex-wrap gap-2">
                {/* TODO: ainda não faz nada */}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#B97204] text-white font-mono-terminal text-[12px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] shadow-[0_3px_12px_-1px_rgba(185,114,4,0.38)]"
                >
                  <Download className="w-4 h-4" />
                  Gerar instalador
                </button>
                <button
                  type="button"
                  onClick={onRestart}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-white text-[#B97204] border border-[#B97204] font-mono-terminal text-[12px] uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Gerar novamente
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Indicador de carregamento em tempo real */}
      {isProcessing && (
        <div className="flex flex-col items-start">
          <span className="text-[11px] font-mono-terminal font-semibold text-[#857967] mb-1 pl-1 flex items-center gap-1 select-none">
            <span className="text-[9px] text-[#B97204]">◆</span> bot
          </span>
          <div className="bg-white border border-[#E4D9C4] border-l-[3px] border-l-[#B97204] px-3.5 py-2 rounded-2xl rounded-tl-xs text-[12px] font-mono-terminal text-[#7E7464] flex items-center gap-2 shadow-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B97204]" />
            <span>digitando...</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default BoardMessage;
