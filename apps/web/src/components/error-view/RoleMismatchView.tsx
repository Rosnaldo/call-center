/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Radio } from 'lucide-react';
import { Header } from '../header/Header.tsx';
import { OnlineUserState } from '@/src/states/online-users/state.ts';

interface RoleMismatchViewProps {
  currentUser: OnlineUserState;
  users: OnlineUserState[];
  onLogout: () => void;
  navigate: (path: string) => void;
  requiredRole: 'customer' | 'attendant';
}

export const RoleMismatchView: React.FC<RoleMismatchViewProps> = ({
  currentUser,
  users,
  onLogout,
  navigate,
  requiredRole,
}) => {
  const isTargetCustomer = requiredRole === 'customer';

  const title = isTargetCustomer
    ? 'Área de Clientes Exclusiva'
    : 'Painel de Atendentes Restrito';

  const description = isTargetCustomer
    ? `O seu perfil conectado no momento é de Atendente (${currentUser.name}). Por favor, troque de perfil ou vá para o painel de atendente.`
    : `O seu perfil conectado no momento é de Cliente (${currentUser.name}). Para administrar o atendimento, altere sua conta ou vá para o espaço de clientes.`;

  const primaryButtonLabel = isTargetCustomer
    ? 'Acessar Painel do Atendente'
    : 'Ir para Meu Espaço do Cliente';

  const primaryButtonTarget = isTargetCustomer ? 'attendant' : 'customer';

  const secondaryButtonLabel = isTargetCustomer
    ? 'Trocar Conta'
    : 'Trocar Perfil';

  return (
    <div className="flex flex-col min-h-screen font-sans">
      <Header users={users} onLogout={onLogout} />
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-grow">
        <div
          id={`role-mismatch-box-${requiredRole}`}
          className="max-w-lg mx-auto text-center py-12 px-6 bg-white border border-slate-200/50 rounded-2xl shadow-sm mt-8"
        >
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 mb-4 border border-rose-100">
            <Radio className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
               id={`role-nav-other-btn-${requiredRole}`}
              onClick={() => navigate(primaryButtonTarget)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition shadow-xs cursor-pointer"
            >
              {primaryButtonLabel}
            </button>
            <button
              id={`role-swap-user-btn-${requiredRole}`}
              onClick={onLogout}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-lg transition cursor-pointer"
            >
              {secondaryButtonLabel}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
