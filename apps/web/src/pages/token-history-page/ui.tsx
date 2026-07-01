/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/header/Header.tsx';
import { Footer } from '../../components/Footer.tsx';
import { ArrowLeft } from 'lucide-react';
import { TransactionsTable } from '../../components/TransactionsTable.tsx';
import { PaginatedTransactionsResponse } from '../../queries/transaction/query.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';
import { useLogout } from '../../hooks/auth/useLogout.ts';

interface TokenHistoryPageUIProps {
  currentUser: OnlineUserState;
  users: OnlineUserState[];
  navigate: (path: string) => void;
  paginatedData: PaginatedTransactionsResponse;
  searchTerm: string;
  typeFilter: 'all' | 'credit' | 'debit';
  currentPage: number;
  itemsPerPage: number;
  handleSearchChange: (val: string) => void;
  handleTypeFilterChange: (val: 'all' | 'credit' | 'debit') => void;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
}

export const TokenHistoryPageUI: React.FC<TokenHistoryPageUIProps> = ({
  currentUser,
  users,
  navigate,
  paginatedData,
  searchTerm,
  typeFilter,
  currentPage,
  itemsPerPage,
  handleSearchChange,
  handleTypeFilterChange,
  setCurrentPage,
}) => {
  const { t } = useTranslation();
  const handleLogout = useLogout();

  return (
    <div id="token-history-page-view" className="flex flex-col min-h-screen font-sans bg-slate-50/50">
      <Header users={users} onLogout={handleLogout} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <button
          onClick={() => navigate(currentUser.role === 'attendant' ? 'attendant' : 'customer')}
          className="group flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {t('tokenHistory.backToPanel')}
        </button>

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{t('tokenHistory.title')}</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
            {t('tokenHistory.subtitle')}
          </p>
        </div>

        <TransactionsTable
          navigate={navigate}
          paginatedData={paginatedData}
          searchTerm={searchTerm}
          typeFilter={typeFilter}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          handleSearchChange={handleSearchChange}
          handleTypeFilterChange={handleTypeFilterChange}
          setCurrentPage={setCurrentPage}
        />
      </main>
      <Footer />
    </div>
  );
};
