import React from 'react';
import { Phone } from 'lucide-react';

interface AnswerCallButtonProps {
  onClick: () => void;
}

export const AnswerCallButton: React.FC<AnswerCallButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      id="lobby-answer-call"
      onClick={onClick}
      className="px-6 py-3 rounded-full flex items-center gap-2 text-white font-semibold transition-all active:scale-95 shadow-lg border cursor-pointer animate-pulse bg-emerald-600 hover:bg-emerald-700 border-emerald-500/20"
    >
      <Phone className="w-4 h-4 fill-white" />
      <span>Atender Chamada</span>
    </button>
  );
};
