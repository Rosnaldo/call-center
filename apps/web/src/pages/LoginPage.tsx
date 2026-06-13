/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Header } from '../components/header/Header.tsx';
import { SimulationLogin } from '../components/login/SimulationLogin.tsx';
import { KeycloakMockLogin } from '../components/login/KeycloakMockLogin.tsx';
import { useOnlineUsersStore } from '../states/online-users/store.ts';
import { OnlineUserState } from '../states/online-users/state.ts';

interface LoginPageProps {
  currentUser: OnlineUserState | null;
  navigate: (path: string) => void;
  handleLogout: () => void;
  handleSelectIdentity: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentUser,
  navigate,
  handleLogout,
  handleSelectIdentity,
}) => {
  const users = useOnlineUsersStore((state) => state.users);

  return (
    <div className="flex flex-col min-h-screen">
      <Header users={users} onLogout={handleLogout} />
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-grow">
        <div className="py-6 sm:py-10">
          {currentUser ? (
            /* ALREADY LOGGED IN VIEW */
            <div id="logged-in-profile-box" className="max-w-md mx-auto text-center py-10 px-6 bg-white border border-slate-200/50 rounded-2xl shadow-sm mt-4 font-sans">
              <div className="relative w-18 h-18 mx-auto mb-4 shrink-0">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full rounded-full object-cover border-2 border-indigo-100 shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`;
                  }}
                />
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Sessão Ativa</h3>
              <p className="text-xs text-slate-500 mt-1">Conectado como <span className="font-semibold text-slate-700">{currentUser.name}</span></p>
              <span className="inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full mt-2">
                {currentUser.role === 'customer' ? 'Cliente' : 'Atendente'}
              </span>

              <div className="mt-8 flex flex-col gap-2.5">
                <button
                  id="login-dashboard-redirect-btn"
                  onClick={() => navigate(currentUser.role === 'customer' ? 'customer' : 'attendant')}
                  className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Ir para Painel Principal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  id="login-logout-redirect-btn"
                  onClick={handleLogout}
                  className="w-full px-5 py-2.5 border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Trocar de Usuário / Sair
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD OR KEYCLOAK LOGIN SCREEN */
            (() => {
              const isSimulation = (import.meta as any).env?.VITE_ENV !== 'production';
              if (isSimulation) {
                return <SimulationLogin onSelect={handleSelectIdentity} users={users} />;
              } else {
                return <KeycloakMockLogin />;
              }
            })()
          )}
        </div>
      </main>
    </div>
  );
};
