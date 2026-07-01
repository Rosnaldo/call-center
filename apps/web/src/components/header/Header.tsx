/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfileBadge } from './UserProfileBadge.tsx';
import { OnlineUserState } from '@/src/states/online-users/state.ts';

interface HeaderProps {
  users: OnlineUserState[];
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  users,
  onLogout,
}) => {
  return (
    <header id="main-header" className="bg-brand-canvas/95 backdrop-blur-md border-b border-brand-border sticky top-0 z-40 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-2 sm:py-0 gap-2">

        {/* Logo & Product Title */}
        <div id="logo-branding-container" className="flex items-center gap-2">
          <div>
            <h1 className="font-bold text-brand-dark text-sm sm:text-base tracking-tight leading-none font-display">
              Open<span className="text-brand-ochre">Call</span>
            </h1>
            <p className="text-[9px] font-mono tracking-widest text-brand-muted uppercase mt-0.5 hidden sm:block">Automated Dispatch</p>
          </div>
        </div>

        {/* Active profile badge actions */}
        <UserProfileBadge users={users} onLogout={onLogout} />
      </div>
    </header>
  );
};
