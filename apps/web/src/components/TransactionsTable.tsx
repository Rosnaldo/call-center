import React from 'react';
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
  typeFilter: 'all' | 'credit' | 'debit';
  currentPage: number;
  itemsPerPage: number;
  handleSearchChange: (val: string) => void;
  handleTypeFilterChange: (val: 'all' | 'credit' | 'debit') => void;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
  const { transactions: paginatedTransactions, total, totalPages, totalCredited, totalDebited } = paginatedData;

  return (
    <>
      {/* Stats Grid Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Total Adicionado */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1.5">Total de Recargas</p>
            <p className="text-xl font-black text-slate-800 font-mono">+{totalCredited} tokens</p>
          </div>
        </div>

        {/* Total Consumido */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="size-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1.5">Consumo Total</p>
            <p className="text-xl font-black text-slate-800 font-mono text-rose-600">-{totalDebited} tokens</p>
          </div>
        </div>
      </div>

      {/* Filter and List Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Action Filters Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por descrição ou atendente..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium text-slate-700 shadow-3xs bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Type Filters Buttons group */}
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleTypeFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => handleTypeFilterChange('credit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                typeFilter === 'credit'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50/20 hover:text-emerald-600'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Recargas
            </button>
            <button
              type="button"
              onClick={() => handleTypeFilterChange('debit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                typeFilter === 'debit'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50/20 hover:text-rose-600'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Consumos
            </button>
          </div>
        </div>

        {/* Table / List View */}
        {paginatedTransactions.length === 0 ? (
          /* EMPTY STATE */
          <div className="py-16 px-4 text-center">
            <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <SlidersHorizontal className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Nenhum lançamento encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || typeFilter !== 'all'
                ? 'Tente remover o filtro de busca ou alternar a categoria de exibição.'
                : 'Seu histórico está vazio. Faça uma recarga via Pix para ver os detalhes aqui.'}
            </p>
            {!searchTerm && typeFilter === 'all' && (
              <button
                type="button"
                onClick={() => navigate('payments')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Efetuar Primeira Recarga
              </button>
            )}
          </div>
        ) : (
          /* TRANSACTION LIST ITEMS */
          <div className="divide-y divide-slate-100">
            {paginatedTransactions.map((tx) => {
              const isCredit = tx.type === 'credit';
              return (
                <div
                  key={tx.id}
                  className="p-4 sm:p-6 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors animate-fade-in"
                >
                  {/* Icon + Detail Column */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`size-10 rounded-xl shrink-0 flex items-center justify-center border shadow-3xs ${
                      isCredit
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {isCredit ? (
                        <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-snug truncate">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-sans">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          {formatDate(tx.timestamp)}
                        </span>
                        <span className="text-slate-200 select-none">•</span>
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-500">
                          Tx: #{tx.id.split('-')[1] || tx.id.substring(0, 8)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Numeric delta */}
                  <div className="text-right shrink-0">
                    <span className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                      isCredit ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg' : 'text-slate-700 bg-slate-100/50'
                    }`}>
                      {isCredit ? '+' : '-'}{tx.amount} {tx.amount === 1 ? 'token' : 'tokens'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-4 sm:px-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="relative inline-flex items-center px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="relative inline-flex items-center px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Próxima
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
              <div>
                <p className="text-xs text-slate-500">
                  Mostrando{' '}
                  <span className="font-semibold text-slate-700">{Math.min((currentPage - 1) * itemsPerPage + 1, total)}</span>
                  {' '}até{' '}
                  <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, total)}</span>
                  {' '}de{' '}
                  <span className="font-semibold text-slate-700">{total}</span> lançamentos
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-lg shadow-3xs -space-x-px gap-1" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="relative inline-flex items-center p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="relative inline-flex items-center p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Footer Guidelines Infobar */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-start gap-2 text-[10px] text-slate-400 font-medium font-sans">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>As transações mostradas acima são carregadas via React-Query direto de nossa entidade Transação persistida, com sincronização em tempo de execução no navegador.</span>
        </div>
      </div>
    </>
  );
};

export const TransactionsTable: React.FC<TransactionsTableProps> = (props) => {
  return <TransactionsTableContent {...props} />;
};
