export type TransacaoTipo = 'credit' | 'debit';

export interface Transacao {
  id: string;
  userId: string;
  type: TransacaoTipo;
  amount: number;
  description: string;
  timestamp: number;
  callId?: string;
}
