/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCurrentUserStore } from '../../states/stores.ts';
import { useTransactionsQuery } from '../../queries/transaction/query.ts';
import { TokenHistoryPageUI } from './ui.tsx';
import { ErrorBoundary } from '../../components/ErrorBoundary.tsx';
import { IUser } from '@repo/shared-types';

const TokenHistoryPageDataLoader: React.FC<{
  currentUser: IUser;
}> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'reload' | 'charge'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { data: paginatedData } = useTransactionsQuery(
    currentUser._id,
    currentPage,
    itemsPerPage,
    searchTerm,
    typeFilter
  );

  return (
    <TokenHistoryPageUI
      currentUser={currentUser}
      navigate={navigate}
      paginatedData={paginatedData}
      searchTerm={searchTerm}
      typeFilter={typeFilter}
      currentPage={currentPage}
      itemsPerPage={itemsPerPage}
      handleSearchChange={(val: string) => { setSearchTerm(val); setCurrentPage(1); }}
      handleTypeFilterChange={(val: 'all' | 'reload' | 'charge') => { setTypeFilter(val); setCurrentPage(1); }}
      setCurrentPage={setCurrentPage}
    />
  );
};

export const TokenHistoryPageContainer: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  if (!currentUser) return null;

  return (
    <ErrorBoundary fallback={
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-brand-dark m-4">
        <p className="text-sm font-bold text-red-900 font-sans">{t('tokenHistory.loadError')}</p>
        <p className="text-xs text-red-700 mt-1 font-sans">{t('tokenHistory.loadErrorHint')}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          {t('tokenHistory.reload')}
        </button>
      </div>
    }>
      <Suspense fallback={
        <div className="bg-white border border-brand-border rounded-2xl shadow-xs overflow-hidden p-8 flex flex-col items-center justify-center min-h-[300px] m-4">
          <div className="w-8 h-8 border-3 border-brand-ochre border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-brand-muted font-semibold font-sans">{t('tokenHistory.loadingEntries')}</p>
        </div>
      }>
        <TokenHistoryPageDataLoader
          currentUser={currentUser}
        />
      </Suspense>
    </ErrorBoundary>
  );
};
