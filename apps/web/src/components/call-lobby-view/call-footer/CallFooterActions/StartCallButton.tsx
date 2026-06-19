import React from 'react';
import { Phone } from 'lucide-react';

interface StartCallButtonProps {
  id?: string;
  onClick: () => void;
  label?: string;
}

export const StartCallButton: React.FC<StartCallButtonProps> = ({
  id = 'lobby-start-call',
  onClick,
  label = 'Call',
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className="px-6 py-3 rounded-full flex items-center gap-2 text-white font-semibold transition-all active:scale-95 shadow-lg border border-transparent cursor-pointer animate-pulse bg-brand-ochre hover:bg-brand-ochre-hover"
    >
      <Phone className="w-4 h-4 fill-white" />
      <span>{label}</span>
    </button>
  );
};
