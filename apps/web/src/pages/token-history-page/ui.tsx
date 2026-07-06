/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/header/Header.tsx';
import { Footer } from '../../components/Footer.tsx';
import { BackToPanelButton } from '../../components/BackToPanelButton.tsx';
import { PlusCircle } from 'lucide-react';
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
  typeFilter: 'all' | 'reload' | 'charge';
  currentPage: number;
  itemsPerPage: number;
  handleSearchChange: (val: string) => void;
  handleTypeFilterChange: (val: 'all' | 'reload' | 'charge') => void;
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
    <div id="token-history-page-view" className="flex flex-col min-h-screen font-sans bg-brand-canvas text-brand-dark">
      <Header users={users} onLogout={handleLogout} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <BackToPanelButton className="mb-6" />

        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-brand-dark font-display">{t('tokenHistory.title')}</h1>
            <p className="text-xs text-brand-muted mt-1 leading-relaxed max-w-2xl">
              {t('tokenHistory.subtitle')}
            </p>
          </div>

          {currentUser.role === 'customer' && (
            <button
              onClick={() => navigate('/payments')}
              className="shrink-0 px-4 py-2.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              {t('header.buyTokens')}
            </button>
          )}
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
