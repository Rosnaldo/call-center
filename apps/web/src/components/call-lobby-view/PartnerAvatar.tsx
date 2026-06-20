import React from 'react';
import { IOnlineUser } from '@repo/shared-types';
import { getInitials } from '@/src/utils/helpers.ts';

interface PartnerAvatarProps {
  partner?: IOnlineUser;
}

export const PartnerAvatar: React.FC<PartnerAvatarProps> = ({ partner }) =>
  partner?.avatarUrl ? (
    <img
      src={partner.avatarUrl}
      alt={partner.name}
      className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-none border-2 border-slate-700/40 transform hover:scale-105 transition duration-300 select-none bg-slate-800"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-brand-ochre/15 flex items-center justify-center text-brand-ochre font-bold text-3xl md:text-4xl shadow-none border-2 border-slate-700/40 tracking-wide transform hover:scale-105 transition duration-300 select-none">
      {getInitials(partner?.name)}
    </div>
  );
