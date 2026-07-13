import { CallState } from '../states/call/state.ts';
import { OnlineUserState } from '../states/online-users/state.ts';
import { User } from '../entities/user.ts';
import { Transacao as TokenTransaction } from '../entities/transacao.ts';

let seq = 0;
const nextId = () => `mock-${++seq}`;

export const buildOnlineUserState = (d?: Partial<OnlineUserState>): OnlineUserState => ({
  id: d?.id ?? nextId(),
  name: d?.name ?? 'Test UserState',
  slug: d?.slug ?? 'test-user',
  email: d?.email ?? 'test@example.com',
  role: d?.role ?? 'customer',
  avatarUrl: d?.avatarUrl ?? '',
  status: d?.status ?? 'idle',
  tokens: d?.tokens ?? 5,
  phone: d?.phone,
});

// currentUser is IUser now, not IOnlineUser — see states/current-user/state.ts.
export const buildUser = (d?: Partial<User>): User => ({
  _id: d?._id ?? nextId(),
  slug: d?.slug ?? 'test-user',
  firstName: d?.firstName ?? 'Test',
  lastName: d?.lastName ?? 'User',
  email: d?.email ?? 'test@example.com',
  phone: d?.phone,
  avatar: d?.avatar,
  role: d?.role ?? 'customer',
  tokens: d?.tokens ?? 5,
  createdAt: d?.createdAt ?? new Date(),
  updatedAt: d?.updatedAt ?? new Date(),
});

export const buildCall = (d?: Partial<CallState>): CallState => ({
  id: d?.id ?? nextId(),
  customerId: d?.customerId ?? nextId(),
  customerName: d?.customerName ?? 'Test Customer',
  attendantId: d?.attendantId ?? nextId(),
  attendantName: d?.attendantName ?? 'Test Attendant',
  roomName: d?.roomName ?? 'test-room',
  activeUserIds: d?.activeUserIds ?? [],
  accumulatedMs: d?.accumulatedMs ?? 0,
  overlapStartedAt: d?.overlapStartedAt !== undefined ? d.overlapStartedAt : Date.now(),
  startedAt: d?.startedAt !== undefined ? d.startedAt : new Date(),
  endedAt: d?.endedAt !== undefined ? d.endedAt : null,
  tokensToBeCharged: d?.tokensToBeCharged ?? 0,
  isClosed: d?.isClosed ?? false,
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
