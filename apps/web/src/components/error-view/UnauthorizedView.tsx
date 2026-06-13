/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserCheck } from 'lucide-react';
import { Header } from '../header/Header.tsx';
import { OnlineUserState } from '@/src/states/online-users/state.ts';

interface UnauthorizedViewProps {
  users: OnlineUserState[];
  onLogout: () => void;
  navigate: (path: string) => void;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  users,
  onLogout,
  navigate,
}) => {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <Header users={users} onLogout={onLogout} />
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-grow flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200/50 max-w-sm shadow-sm">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <UserCheck className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Acesso Restrito</h3>
          <p className="text-xs text-slate-500 mt-2">Você precisa estar conectado para acessar esta página.</p>
          <button
            id="exception-login-redirect-btn"
            onClick={() => navigate('login')}
            className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer"
          >
            Fazer Login
          </button>
        </div>
      </main>
    </div>
  );
};
