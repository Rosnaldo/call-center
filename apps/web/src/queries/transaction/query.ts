/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSuspenseQuery } from '@tanstack/react-query';
import { MOCK_TRANSACTIONS } from './mock.ts';
import properties from '../../properties';

export interface PaginatedTransactionsResponse {
  transactions: any[];
  total: number;
  totalPages: number;
  totalCredited: number;
  totalDebited: number;
}

export async function fetchTransactions(
  userId: string,
  page: number = 1,
  limit: number = 8,
  search?: string,
  type?: string
): Promise<PaginatedTransactionsResponse> {
  if (properties.isSimulation) {
    const userTxs = MOCK_TRANSACTIONS.filter(tx => tx.userId === userId);
    const totalCredited = userTxs
      .filter(tx => tx.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalDebited = userTxs
      .filter(tx => tx.type === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      transactions: userTxs,
      total: userTxs.length,
      totalPages: 1,
      totalCredited,
      totalDebited,
    };
  }

  try {
    let url = `/api/transactions?userId=${userId}&page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Server communication error.");
    }
    const data = await res.json();
    
    return {
      transactions: data.transactions || [],
      total: data.total ?? 0,
      totalPages: data.totalPages ?? 1,
      totalCredited: data.totalCredited ?? 0,
      totalDebited: data.totalDebited ?? 0,
    };
  } catch (error) {
    console.warn("Could not fetch server transactions, falling back to local empty state:", error);
    return {
      transactions: [],
      total: 0,
      totalPages: 1,
      totalCredited: 0,
      totalDebited: 0,
    };
  }
}

export function useTransactionsQuery(
  userId: string,
  page: number,
  limit: number,
  search?: string,
  type?: string
) {
  return useSuspenseQuery({
    queryKey: ['transactions', userId, page, limit, search, type],
    queryFn: () => fetchTransactions(userId, page, limit, search, type),
  });
}
