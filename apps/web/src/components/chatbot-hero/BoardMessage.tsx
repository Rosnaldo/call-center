import React, { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useChatbotStore } from '../../states/stores.ts';

interface BoardMessageProps {
  isProcessing?: boolean;
  className?: string;
}

export const BoardMessage: React.FC<BoardMessageProps> = ({
  isProcessing = false,
  className = '',
}) => {
  const messages = useChatbotStore(s => s.messages);
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
