import { CallState } from '../states/call/state.ts';
import { OnlineUserState } from '../states/online-users/state.ts';
import { Transacao as TokenTransaction } from '../entities/transacao.ts';

let seq = 0;
const nextId = () => `mock-${++seq}`;

export const buildOnlineUserState = (d?: Partial<OnlineUserState>): OnlineUserState => ({
  id: d?.id ?? nextId(),
  name: d?.name ?? 'Test UserState',
  email: d?.email ?? 'test@example.com',
  role: d?.role ?? 'customer',
  avatarUrl: d?.avatarUrl ?? '',
  status: d?.status ?? 'idle',
  tokens: d?.tokens ?? 5,
});

export const buildCall = (d?: Partial<CallState>): CallState => ({
  id: d?.id ?? nextId(),
  customerId: d?.customerId ?? nextId(),
  customerName: d?.customerName ?? 'Test Customer',
  attendantId: d?.attendantId ?? nextId(),
  attendantName: d?.attendantName ?? 'Test Attendant',
  dailycoUrl: d?.dailycoUrl ?? 'https://meet.example.com/test',
  status: d?.status ?? 'active',
  startedAt: d?.startedAt ?? Date.now(),
  tokensCharged: d?.tokensCharged ?? 1,
});

export const buildTokenTransaction = (d?: Partial<TokenTransaction>): TokenTransaction => ({
  id: d?.id ?? nextId(),
  userId: d?.userId ?? nextId(),
  type: d?.type ?? 'debit',
  amount: d?.amount ?? 1,
  description: d?.description ?? 'Test transaction',
  timestamp: d?.timestamp ?? Date.now(),
  callId: d?.callId,
});
