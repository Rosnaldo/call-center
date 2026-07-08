import React from 'react';
import { Loader2, Phone } from 'lucide-react';

interface StartCallButtonProps {
  id?: string;
  onClick: () => void;
  label?: string;
  isLoading?: boolean;
}

export const StartCallButton: React.FC<StartCallButtonProps> = ({
  id = 'lobby-start-call',
  onClick,
  label = 'Call',
  isLoading = false,
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={isLoading}
      className="px-6 py-3 rounded-full flex items-center gap-2 text-white font-semibold transition-all active:scale-95 shadow-lg border border-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 disabled:animate-none animate-pulse bg-brand-ochre hover:bg-brand-ochre-hover"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Phone className="w-4 h-4 fill-white" />
      )}
      <span>{label}</span>
    </button>
  );
};
