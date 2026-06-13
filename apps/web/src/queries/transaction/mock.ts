/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MOCK_TRANSACTIONS = [
  {
    id: 'tx-1',
    userId: 'cust-emily',
    type: 'credit',
    amount: 10,
    description: 'Compra de tokens via Pix',
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'tx-2',
    userId: 'cust-emily',
    type: 'debit',
    amount: 5,
    description: 'Atendimento com Alex Mercer',
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'tx-3',
    userId: 'cust-david',
    type: 'credit',
    amount: 5,
    description: 'Compra de tokens via Pix',
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
  },
  {
    id: 'tx-4',
    userId: 'cust-david',
    type: 'debit',
    amount: 3,
    description: 'Atendimento com Samantha Cruz',
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
  }
];

export async function getMockTransactions(localTransactions: any[]): Promise<any[]> {
  return localTransactions;
}
