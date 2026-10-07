import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BoardMessage from './BoardMessage';
import AllowedAppsModal from './AllowedAppsModal';
import { useChatbotStore } from '../../states/stores.ts';
import { ChatbotWs } from '../../services/ws/chatbot-ws.ts';
import type { ChatbotChoice } from '../../states/local/chatbot/state.ts';

export const ChatbotHero: React.FC = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const isProcessing = useChatbotStore(s => s.isBotTyping);
  const chatbotWs = useRef<ChatbotWs | null>(null);

  useEffect(() => {
    const ws = new ChatbotWs(useChatbotStore);
    chatbotWs.current = ws;
    ws.connect();
    return () => {
      ws.disconnect();
      chatbotWs.current = null;
    };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (chatbotWs.current?.sendMessage(text)) setInput('');
  };

  const handleAnswer = ({ value, label }: ChatbotChoice) => chatbotWs.current?.sendMessage(value, label);
  const handleRestart = () => chatbotWs.current?.restart();
  const handleAllowedApps = (apps: string[]) => chatbotWs.current?.sendAllowedApps(apps) ?? false;
  // Stable: the modal's debounce effect depends on it.
  const handleSearchApps = useCallback((term: string) => chatbotWs.current?.searchApps(term), []);

  return (
    <div className="w-full flex justify-center select-none overflow-hidden">
      {/* The Chat Bot Card */}
      <div
        className="w-full transition-all duration-300 relative overflow-hidden"
        style={{
          borderRadius: '22px',
          backgroundColor: '#FDFBF7',
          border: '1.5px solid #E4DAC6',
          boxShadow: '0 18px 36px -12px rgba(165, 120, 50, 0.09), 0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* 1. Terminal / Hive Prompt Header Bar */}
        <div
          className="w-full flex items-center justify-between border-b transition-colors px-4.5 py-2.5"
          style={{
            backgroundColor: '#F5EFE4',
            borderBottomColor: '#E8DECA',
            fontFamily: '"JetBrains Mono", Menlo, Consolas, monospace',
          }}
        >
          <div className="flex items-center gap-2 overflow-hidden text-left truncate">
            {/* Amber Diamond Icon */}
            <span
              className="text-[11px] leading-none select-none shrink-0"
              style={{ color: '#B97204' }}
            >
              ◆
            </span>

            {/* Hive breadcrumb path */}
            <span className="text-[12.5px] font-mono-terminal font-medium tracking-tight text-[#524B3D] truncate">
              <span
                style={{ color: '#524A3D' }}
                className="font-normal"
              >
                {t('chatbot.title')}
              </span>
            </span>
          </div>
        </div>
        <BoardMessage isProcessing={isProcessing} onAnswer={handleAnswer} onRestart={handleRestart} />

        {/* Single-Row Launcher */}
        <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3 transition-colors px-4.5 py-3.5 bg-white">
          <div className="flex-1 flex items-center gap-1.5 px-2 font-mono-terminal text-[15px]">

            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder={t('chatbot.inputPlaceholder')}
              className="w-full bg-transparent border-none outline-none font-mono-terminal text-[#1F1A13] placeholder-[#A09787] text-[15px] p-0 focus:ring-0 selection:bg-[#B97204]/20"
              style={{ fontFamily: '"JetBrains Mono", Menlo, Consolas, monospace' }}
              aria-label={t('chatbot.inputLabel')}
            />
          </div>

          {/* Deploy Agents Button */}
          <button
            type="button"
            onClick={handleSend}
            className="relative inline-flex items-center justify-center gap-2 cursor-pointer font-mono-terminal uppercase font-bold tracking-wider transition-all duration-200 active:scale-[0.98] select-none shrink-0"
            style={{
              backgroundColor: '#B97204',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '12px',
              padding: '11px 22px',
              boxShadow: '0 3px 12px -1px rgba(185, 114, 4, 0.38)',
              fontFamily: '"JetBrains Mono", Menlo, Consolas, monospace',
            }}
          >
            <span>{t('chatbot.send')}</span>
          </button>
        </div>
      </div>
      <AllowedAppsModal onSubmit={handleAllowedApps} onSearch={handleSearchApps} />
    </div>
  );
};
