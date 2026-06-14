/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { useTransactionsQuery } from '../../queries/transaction/query.ts';
import { TokenHistoryPageUI } from './ui.tsx';
import { ErrorBoundary } from '../../components/ErrorBoundary.tsx';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';

const TokenHistoryPageDataLoader: React.FC<{
  currentUser: OnlineUserState;
  users: OnlineUserState[];
}> = ({ currentUser, users }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { data: paginatedData } = useTransactionsQuery(
    currentUser.id,
    currentPage,
    itemsPerPage,
    searchTerm,
    typeFilter
  );

  return (
    <TokenHistoryPageUI
      currentUser={currentUser}
      users={users}
      navigate={navigate}
      paginatedData={paginatedData}
      searchTerm={searchTerm}
      typeFilter={typeFilter}
      currentPage={currentPage}
      itemsPerPage={itemsPerPage}
      handleSearchChange={(val: string) => { setSearchTerm(val); setCurrentPage(1); }}
      handleTypeFilterChange={(val: 'all' | 'credit' | 'debit') => { setTypeFilter(val); setCurrentPage(1); }}
      setCurrentPage={setCurrentPage}
    />
  );
};

export const TokenHistoryPageContainer: React.FC = () => {
  const navigate = useNavigate();
  const users = useOnlineUsersStore((state) => state.users);
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm text-center">
          <p className="text-slate-600 mb-4">Você precisa estar logado para acessar esta página.</p>
          <button
            onClick={() => navigate('login')}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-slate-800 m-4">
        <p className="text-sm font-bold text-red-900 font-sans">Erro ao carregar tabela de transações</p>
        <p className="text-xs text-red-700 mt-1 font-sans">Por favor, tente recarregar ou consulte os logs.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Recarregar
        </button>
      </div>
    }>
      <Suspense fallback={
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden p-8 flex flex-col items-center justify-center min-h-[300px] m-4">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-400 font-semibold font-sans">Carregando lançamentos com React Query...</p>
        </div>
      }>
        <TokenHistoryPageDataLoader
          currentUser={currentUser}
          users={users}
        />
      </Suspense>
    </ErrorBoundary>
  );
};
