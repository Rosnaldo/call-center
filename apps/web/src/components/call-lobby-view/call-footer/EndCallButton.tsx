import React from 'react';
import { PhoneOff } from 'lucide-react';

interface EndCallButtonProps {
  id?: string;
  onClick: () => void;
  label?: string;
}

export const EndCallButton: React.FC<EndCallButtonProps> = ({
  id = 'lobby-end-call',
  onClick,
  label,
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className="px-6 py-3 rounded-full flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold transition-all active:scale-95 shadow-lg border border-red-500/20 cursor-pointer"
    >
      <PhoneOff className="w-4 h-4 fill-white" />
      <span>{label || 'Leave'}</span>
    </button>
  );
};
