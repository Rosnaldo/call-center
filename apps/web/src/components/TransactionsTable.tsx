import React from 'react';
import { useTranslation } from 'react-i18next';
import { PaginatedTransactionsResponse } from '../queries/transaction/query.ts';
import {
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  PlusCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

interface TransactionsTableProps {
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

export const TransactionsTableContent: React.FC<TransactionsTableProps> = ({
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
  const { transactions: paginatedTransactions, total, totalPages, totalCredited, totalDebited } = paginatedData;

  return (
    <>
      {/* Stats Grid Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Total Adicionado */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest leading-none mb-1.5">{t('transactions.totalTopUps')}</p>
            <p className="text-xl font-black text-brand-dark font-mono">+{totalCredited} tokens</p>
          </div>
        </div>

        {/* Total Consumido */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="size-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest leading-none mb-1.5">{t('transactions.totalUsage')}</p>
            <p className="text-xl font-black text-orange-600 font-mono">-{totalDebited} tokens</p>
          </div>
        </div>
      </div>

      {/* Filter and List Container */}
      <div className="bg-white border border-brand-border rounded-2xl shadow-xs overflow-hidden">
        {/* Action Filters Bar */}
        <div className="p-4 sm:p-6 border-b border-brand-border bg-brand-panel/35 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('transactions.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-xs border border-brand-border rounded-xl focus:outline-hidden focus:border-brand-ochre font-medium text-brand-dark shadow-3xs bg-white"
            />
            <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Type Filters Buttons group */}
          <div className="flex bg-white border border-brand-border p-1 rounded-xl gap-1 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleTypeFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-brand-panel text-brand-dark shadow-3xs'
                  : 'text-brand-muted hover:text-brand-dark'
              }`}
            >
              {t('transactions.all')}
            </button>
            <button
              type="button"
              onClick={() => handleTypeFilterChange('reload')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'reload'
                  ? 'bg-emerald-50 text-emerald-700 shadow-3xs'
                  : 'text-brand-muted hover:text-brand-dark'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              {t('transactions.topUps')}
            </button>
            <button
              type="button"
              onClick={() => handleTypeFilterChange('charge')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'charge'
                  ? 'bg-orange-50 text-orange-700 shadow-3xs'
                  : 'text-brand-muted hover:text-brand-dark'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              {t('transactions.usage')}
            </button>
          </div>
        </div>

        {/* Table / List View */}
        {paginatedTransactions.length === 0 ? (
          /* EMPTY STATE */
          <div className="py-16 px-4 text-center">
            <div className="size-16 rounded-full bg-brand-panel flex items-center justify-center text-brand-muted mx-auto mb-4">
              <SlidersHorizontal className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-brand-dark">{t('transactions.noEntriesFound')}</h3>
            <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
              {searchTerm || typeFilter !== 'all'
                ? t('transactions.removeFilterHint')
                : t('transactions.emptyHistory')}
            </p>
            {!searchTerm && typeFilter === 'all' && (
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-ochre hover:bg-brand-ochre-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                {t('transactions.firstTopUp')}
              </button>
            )}
          </div>
        ) : (
          /* TRANSACTION LIST ITEMS */
          <div className="divide-y divide-brand-border">
            {paginatedTransactions.map((tx) => {
              const isReload = tx.type === 'reload';
              return (
                <div
                  key={tx.id}
                  className="p-4 sm:p-6 flex items-center justify-between gap-4 hover:bg-brand-panel/25 transition-colors animate-fade-in"
                >
                  {/* Icon + Detail Column */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`size-10 rounded-xl shrink-0 flex items-center justify-center border shadow-3xs ${
                      isReload
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-orange-50 text-orange-600 border-orange-100'
                    }`}>
                      {isReload ? (
                        <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-brand-dark leading-snug truncate">
                        {tx.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-brand-muted">
                        <span className="flex items-center gap-1 font-sans">
                          <Calendar className="w-3 h-3 text-brand-muted/75" />
                          {tx.date}
                        </span>
                        <span className="text-brand-border select-none">•</span>
                        <span className="font-mono bg-brand-panel px-1.5 py-0.5 rounded font-semibold text-brand-muted">
                          Tx: #{tx.id.split('-')[1] || tx.id.substring(0, 8)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Numeric delta */}
                  <div className="text-right shrink-0">
                    <span className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                      isReload ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg' : 'text-orange-600 bg-orange-50/60 px-2 py-1 rounded-lg'
                    }`}>
                      {isReload ? '+' : '-'}{tx.amount} {tx.amount === 1 ? 'token' : 'tokens'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-4 sm:px-6 bg-brand-panel/35 border-t border-brand-border flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="relative inline-flex items-center px-4 py-2 border border-brand-border text-xs font-semibold rounded-lg text-brand-dark bg-white hover:bg-brand-panel disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('transactions.previous')}
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="relative inline-flex items-center px-4 py-2 border border-brand-border text-xs font-semibold rounded-lg text-brand-dark bg-white hover:bg-brand-panel disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('transactions.next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
              <div>
                <p className="text-xs text-brand-muted">
                  {t('transactions.showing')}{' '}
                  <span className="font-semibold text-brand-dark">{Math.min((currentPage - 1) * itemsPerPage + 1, total)}</span>
                  {' '}{t('transactions.to')}{' '}
                  <span className="font-semibold text-brand-dark">{Math.min(currentPage * itemsPerPage, total)}</span>
                  {' '}{t('transactions.of')}{' '}
                  <span className="font-semibold text-brand-dark">{total}</span> {t('transactions.entries')}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-lg shadow-3xs -space-x-px gap-1" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="relative inline-flex items-center p-1.5 rounded-lg border border-brand-border bg-white text-xs font-medium text-brand-muted hover:bg-brand-panel disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        currentPage === page
                          ? 'bg-brand-ochre border-brand-ochre text-white shadow-xs'
                          : 'bg-white border-brand-border text-brand-muted hover:bg-brand-panel'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="relative inline-flex items-center p-1.5 rounded-lg border border-brand-border bg-white text-xs font-medium text-brand-muted hover:bg-brand-panel disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Footer Guidelines Infobar */}
        <div className="bg-brand-panel/40 p-4 border-t border-brand-border flex items-start gap-2 text-[10px] text-brand-muted font-medium font-sans">
          <Info className="w-4 h-4 text-brand-ochre shrink-0" />
          <span>{t('transactions.infoFooter')}</span>
        </div>
      </div>
    </>
  );
};

export const TransactionsTable: React.FC<TransactionsTableProps> = (props) => {
  return <TransactionsTableContent {...props} />;
};
