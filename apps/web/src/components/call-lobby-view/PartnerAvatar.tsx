import React from 'react';
import { IOnlineUser } from '@repo/shared-types';
import { getInitials } from '@/src/utils/helpers.ts';

interface PartnerAvatarProps {
  partner?: IOnlineUser | null;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  fadeIn?: boolean;
}

const sizeClasses = {
  sm: { container: 'w-16 h-16', text: 'text-lg' },
  md: { container: 'w-20 h-20', text: 'text-2xl' },
  lg: { container: 'w-24 h-24 md:w-28 md:h-28', text: 'text-3xl md:text-4xl' },
};

export const PartnerAvatar: React.FC<PartnerAvatarProps> = ({ partner, size = 'lg', pulse = false, fadeIn = false }) => {
  const { container, text } = sizeClasses[size];
  const animations = [
    fadeIn && 'pulse-fade-in',
    pulse && 'pulse-pulse',
  ].filter(Boolean).join(' ');

  return partner?.avatarUrl ? (
    <img
      src={partner.avatarUrl}
      alt={partner.name}
      className={`${container} rounded-full object-cover shadow-none border border-slate-500/20 select-none bg-slate-800 ${animations}`}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className={`${container} rounded-full bg-brand-ochre/15 flex items-center justify-center text-brand-ochre font-bold ${text} shadow-none border border-slate-500/20 select-none ${animations}`}>
      {getInitials(partner?.name)}
    </div>
  );
};
