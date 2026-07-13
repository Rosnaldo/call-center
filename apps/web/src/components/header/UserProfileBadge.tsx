/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Radio, ChevronDown, Settings, Coins, LayoutDashboard, History } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUserStore } from '@/src/states/stores.ts';
import { getFullName } from '@/src/entities/user.ts';

interface UserProfileBadgeProps {
  onLogout: () => void;
}

export const UserProfileBadge: React.FC<UserProfileBadgeProps> = ({
  onLogout,
}) => {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const navigate = useNavigate();
  const { pathname: currentPath } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!currentUser) {
    return (
      <div id="header-inactive-status-area" className="flex items-center gap-1.5 text-[11px] text-brand-muted">
        <Radio className="w-3 h-3 text-brand-muted animate-pulse" />
        <span className="hidden sm:inline">{t('header.disconnected')}</span>
      </div>
    );
  }

  const tokensCount = currentUser.tokens ?? 0;
  const fullName = getFullName(currentUser);

  return (
    <div id="header-active-profile-area" className="flex items-center gap-2 relative select-none" ref={dropdownRef}>
      {currentUser.role === 'customer' && (
        <span
          className="text-[10px] font-mono font-medium text-brand-muted select-none flex items-center gap-1 cursor-default bg-brand-panel px-2.5 py-1 rounded-lg border border-brand-border"
          title={t('header.tokenBalance')}
        >
          tokens: <span className="font-bold text-brand-ochre">{tokensCount}</span>
        </span>
      )}

      <button
        id="profile-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-brand-panel hover:bg-brand-panel/85 border border-brand-border px-3 py-1.5 rounded-2xl transition-all select-none text-left cursor-pointer focus:outline-none"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="relative shrink-0">
          <img
            src={currentUser.avatar?.url}
            alt={fullName}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-brand-border-dark"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`;
            }}
          />
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
        </div>

        <div className="hidden md:block">
          <div className="text-[11px] font-bold text-brand-dark leading-tight">
            {fullName}
          </div>
          <div className="text-[8px] uppercase font-bold tracking-wide text-brand-ochre">
            {{
              customer: t('header.roleCustomer'),
              admin: t('header.roleAdmin'),
              attendant: t('header.roleAttendant'),
            }[currentUser.role]}
          </div>
        </div>

        <ChevronDown className={`w-3 h-3 text-brand-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          id="profile-dropdown-menu"
          className="absolute right-0 top-full mt-2.5 w-60 bg-white border border-[#ebdcb9]/50 rounded-[20px] shadow-[0_12px_36px_rgba(163,101,0,0.12),_0_4px_12px_rgba(163,101,0,0.03)] z-50 overflow-hidden font-sans p-1 flex flex-col"
        >
          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-[#e4dcce]/50 flex flex-col text-left">
            <span className="font-extrabold text-sm text-brand-dark tracking-tight leading-tight">
              {fullName}
            </span>
            <span className="text-xs text-brand-muted/80 truncate mt-0.5 font-medium leading-none">
              {currentUser.email}
            </span>
          </div>

          {/* Options */}
          <div className="p-1 space-y-0.5">
            {currentPath !== (currentUser.role === 'customer' ? '/customer' : '/attendant') && (
              <button
                id="dropdown-option-dashboard"
                onClick={() => {
                  setIsOpen(false);
                  navigate(currentUser.role === 'customer' ? '/customer' : '/attendant');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs text-brand-dark hover:text-[#a36500] hover:bg-brand-panel/40 transition-all rounded-xl font-semibold cursor-pointer border-0 bg-transparent"
              >
                <LayoutDashboard className="w-4 h-4 text-brand-muted shrink-0" />
                {t('header.dashboard', { role: currentUser.role === 'customer' ? t('header.roleCustomer') : t('header.roleAttendant') })}
              </button>
            )}

            {currentPath !== '/profile' && (
              <button
                id="dropdown-option-settings"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs text-brand-dark hover:text-[#a36500] hover:bg-brand-panel/40 transition-all rounded-xl font-semibold cursor-pointer border-0 bg-transparent"
              >
                <Settings className="w-4 h-4 text-brand-muted shrink-0" />
                {t('header.profileSettings')}
              </button>
            )}

            {currentUser.role === 'customer' && (
              <>
                <button
                  id="dropdown-option-payments"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/payments');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs text-brand-dark hover:text-[#a36500] hover:bg-brand-panel/40 transition-all rounded-xl font-semibold cursor-pointer border-0 bg-transparent"
                >
                  <Coins className="w-4 h-4 text-brand-muted shrink-0" />
                  {t('header.buyTokens')}
                </button>

                <button
                  id="dropdown-option-token-history"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/token-history');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs text-brand-dark hover:text-[#a36500] hover:bg-brand-panel/40 transition-all rounded-xl font-semibold cursor-pointer border-0 bg-transparent"
                >
                  <History className="w-4 h-4 text-brand-muted shrink-0" />
                  {t('header.usageHistory')}
                </button>
              </>
            )}

            <button
              id="dropdown-option-logout"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs text-brand-dark hover:text-[#a36500] hover:bg-brand-panel/40 transition-all rounded-xl font-semibold cursor-pointer border-0 bg-transparent"
            >
              <LogOut className="w-4 h-4 text-brand-muted shrink-0" />
              {t('header.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

