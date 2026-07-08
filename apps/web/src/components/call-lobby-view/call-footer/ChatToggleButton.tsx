import React from 'react';
import { MessageSquare, MessageSquareOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatToggleButtonProps {
  id?: string;
  isOpen: boolean;
  hasUnreadMessage?: boolean;
  onClick: () => void;
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({
  id = 'lobby-chat-toggle',
  isOpen,
  hasUnreadMessage = false,
  onClick,
}) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      title={isOpen ? t('call.closeChat') : t('call.openChat')}
      className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md border ${
        isOpen
          ? 'bg-brand-ochre hover:bg-brand-ochre-hover text-white border-transparent active:scale-95 cursor-pointer'
          : 'bg-[#2a2d31] hover:bg-[#34383d] text-slate-200 border-transparent active:scale-95 cursor-pointer'
      }`}
    >
      {isOpen ? <MessageSquareOff className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      {hasUnreadMessage && (
        <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[#e0c493] border border-[#2a2d31]" />
      )}
    </button>
  );
};
