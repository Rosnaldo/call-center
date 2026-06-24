/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfileBadge } from './UserProfileBadge.tsx';
import { OnlineUserState } from '@/src/states/online-users/state.ts';
import properties from '../../properties';

interface HeaderProps {
  users: OnlineUserState[];
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  users,
  onLogout,
}) => {
  const reactNavigator = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const navigate = useCallback((path: string) => {
    if (path.startsWith('/')) {
      reactNavigator(path);
    } else {
      reactNavigator(`/${path}`);
    }
  }, [reactNavigator]);
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

        {/* Navigation Route Tabs */}
        {properties.isSimulation && (
          <nav id="header-navigation-tabs" className="flex items-center gap-1 bg-brand-panel border border-brand-border p-1 rounded-xl">
            <button
              id="nav-route-login"
              onClick={() => navigate('login')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                currentPath === '/login' || currentPath === '/'
                  ? 'bg-brand-card text-brand-ochre shadow-xs'
                  : 'text-brand-muted hover:text-brand-dark hover:bg-brand-card/60'
              }`}
            >
              Login
            </button>
            <button
              id="nav-route-customer"
              onClick={() => navigate('customer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                currentPath === '/customer'
                  ? 'bg-brand-card text-brand-ochre shadow-xs'
                  : 'text-brand-muted hover:text-brand-dark hover:bg-brand-card/60'
              }`}
            >
              Área do Cliente
            </button>
            <button
              id="nav-route-attendant"
              onClick={() => navigate('attendant')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                currentPath === '/attendant'
                  ? 'bg-brand-card text-brand-ochre shadow-xs'
                  : 'text-brand-muted hover:text-brand-dark hover:bg-brand-card/60'
              }`}
            >
              Atendimento (Agente)
            </button>
          </nav>
        )}

        {/* Active profile badge actions */}
        <UserProfileBadge users={users} onLogout={onLogout} />
      </div>
    </header>
  );
};
