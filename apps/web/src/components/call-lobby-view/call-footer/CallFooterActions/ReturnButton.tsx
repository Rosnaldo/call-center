import React from 'react';
import { Phone } from 'lucide-react';

interface ReturnButtonProps {
  onClick: () => void;
}

export const ReturnButton: React.FC<ReturnButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      id="lobby-return-call"
      onClick={onClick}
      className="px-6 py-3 rounded-full flex items-center gap-2 text-white font-semibold transition-all active:scale-95 shadow-lg border border-transparent cursor-pointer animate-pulse bg-brand-ochre hover:bg-brand-ochre-hover"
    >
      <Phone className="w-4 h-4 fill-white" />
      <span>Return</span>
    </button>
  );
};
