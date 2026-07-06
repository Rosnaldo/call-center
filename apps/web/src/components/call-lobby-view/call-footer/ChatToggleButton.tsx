import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatStore } from '../../../states/stores.ts';

interface ChatToggleButtonProps {
  id?: string;
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({
  id = 'lobby-chat-toggle',
}) => {
  const isOpen = useChatStore(s => s.isOpen);

  const handleClick = () => {
    if (useChatStore.getState().isOpen) {
      useChatStore.getState().closeChat();
      return;
    }
    useChatStore.getState().openChat();
    useChatStore.getState().fetchChatMessages();
  };

  return (
    <button
      type="button"
      id={id}
      onClick={handleClick}
      title={isOpen ? 'Fechar Chat' : 'Abrir Chat'}
      aria-label={isOpen ? 'Fechar Chat' : 'Abrir Chat'}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border ${
        isOpen
          ? 'bg-brand-ochre hover:bg-brand-ochre-hover text-white border-transparent active:scale-95 cursor-pointer'
          : 'bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer'
      }`}
    >
      <MessageSquare className="w-5 h-5" />
    </button>
  );
};
