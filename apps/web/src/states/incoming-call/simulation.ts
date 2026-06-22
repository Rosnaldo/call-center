import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import { useOnlineUsersStore, useCallStore, useCallViewStore } from '../stores.ts';
import { playNotificationChime } from '@/src/utils/helpers.ts';

export const simulateSendIncomingCall = (
  set: (arg: Partial<IncomingCallStore> | ((state: IncomingCallStore) => Partial<IncomingCallStore>)) => void,
  customerId?: string,
  attendantId?: string | null,
) => {
  set(() => {
    const { users } = useOnlineUsersStore.getState();
    if (!customerId || !attendantId) return {};

    const customer = users.find(u => u.id === customerId);
    const attendant = users.find(u => u.id === attendantId);
    if (!customer || !attendant) return {};

    if ((customer.tokens ?? 0) <= 0) return {};
    if (attendant.status !== 'idle') return {};

    const incoming: IncomingCallState = { customerId, attendantId, whoIsCalling: 'customer' };
    playNotificationChime();

    useCallViewStore.getState().setViewState('awaiting-answer');
    return { incomingCall: incoming };
  });
};

export const simulateCancelIncomingCall = (
  set: (arg: Partial<IncomingCallStore>) => void,
  get: () => IncomingCallStore,
) => {
  const incomingCall = get().incomingCall;
  if (!incomingCall) return;

  const { updateUser } = useOnlineUsersStore.getState();
  updateUser(incomingCall.customerId, { status: 'idle' as const });
  set({ incomingCall: null });
  useCallViewStore.getState().setViewState('none');
  useCallViewStore.getState().setSelectedAttendantId(null);
};

export const simulateIncomingCall = (
  set: (arg: Partial<IncomingCallStore>) => void,
  get: () => IncomingCallStore,
  attendantId: string,
) => {
  const { call } = useCallStore.getState();
  const users = useOnlineUsersStore.getState().users;
  const attendant = users.find(u => u.id === attendantId);
  if (!attendant) return;

  const customer = users.find(u => u.role === 'customer' && (u.tokens ?? 5) > 0 && u.status === 'idle');
  if (!customer) return;

  const existingIncoming = get().incomingCall;
  const isOccupied =
    (call?.attendantId === attendantId) ||
    existingIncoming?.attendantId === attendantId;
  if (isOccupied) return;

  useOnlineUsersStore.getState().updateUser(customer.id, { status: 'in-call' as const });
  set({ incomingCall: { customerId: customer.id, attendantId, whoIsCalling: 'customer' } });
  useCallViewStore.getState().setViewState('lobby');
};

export const simulateIncomingCallAsCustomer = (
  set: (arg: Partial<IncomingCallStore>) => void,
  get: () => IncomingCallStore,
  customerId: string,
  attendantId: string,
) => {
  const { call } = useCallStore.getState();
  const users = useOnlineUsersStore.getState().users;
  const customer = users.find(u => u.id === customerId);
  const attendant = users.find(u => u.id === attendantId);
  if (!customer || !attendant) return;
  if ((customer.tokens ?? 0) <= 0) return;
  if (attendant.status !== 'idle') return;
  if (get().incomingCall) return;
  if (call?.customerId === customerId) return;

  useOnlineUsersStore.getState().updateUser(customerId, { status: 'in-call' as const });
  set({ incomingCall: { customerId, attendantId, whoIsCalling: 'customer' } });
};
