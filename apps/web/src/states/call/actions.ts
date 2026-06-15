/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useOnlineUsersStore } from '../online-users/store.ts';
import { useCurrentUserStore } from '../current-user/store.ts';
import { playNotificationChime, generateMeetUrl } from '../../utils/helpers.ts';
import { CallState, CallStore, initialCallStore } from './state.ts';

export function billingRecurringChargeUpdate(
  prev: CallStore,
  callId: string
): CallStore {
  const call = prev.call?.id === callId ? prev.call : undefined;
  if (!call) return prev;

  return {
    ...prev,
    call: { ...call, tokensCharged: (call.tokensCharged || 1) + 1 }
  };
}

export interface CallActions {
  setCallState: (stateOrFn: any) => void;
  initiateCall: (customerId: string, attendantId: string) => void;
  completeCall: (attendantId: string, callId?: string, byAttendant?: boolean) => void;
  updateCall: (callId: string, updates: Partial<CallState>) => void;
  billingOutOfTokens: (callId: string) => void;
  resetSimulation: () => void;
  simulateIncomingCall: (attendantId: string) => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void
): CallActions => {
  return {
    setCallState: (stateOrFn) => {
      set((state) => {
        const prevCallState = { call: state.call };
        const nextCallState = typeof stateOrFn === 'function' ? stateOrFn(prevCallState) : stateOrFn;
        return { call: nextCallState.call };
      });
    },

    initiateCall: (customerId, attendantId) => {
      set((state) => {
        const { users, setUsers } = useOnlineUsersStore.getState();
        const customer = users.find(u => u.id === customerId);
        const attendant = users.find(u => u.id === attendantId);
        if (!customer || !attendant) return {};

        if ((customer.tokens ?? 0) <= 0) return {};

        const call = state.call;
        const attendantIsOccupied = call?.attendantId === attendantId &&
          (call.status === 'active' || call.status === 'awaiting-answer' || call.status === 'call-interrupteded');
        if (attendantIsOccupied) return {};

        const newCall: CallState = {
          id: `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          customerId,
          customerName: customer.name,
          attendantId,
          attendantName: attendant.name,
          roomUrl: generateMeetUrl(),
          status: 'awaiting-answer',
          tokensCharged: 1
        };

        setUsers(users.map(u => u.id === customerId ? { ...u, status: 'in-call' as const } : u));

        return { call: newCall };
      });
    },

    completeCall: (attendantId, callId, byAttendant) => {
      set((state) => {
        const { users, updateUser } = useOnlineUsersStore.getState();
        const { currentUser, setCurrentUser } = useCurrentUserStore.getState();
        const activeStatuses = ['active', 'awaiting-answer', 'call-interrupteded'] as const;

        const completedCall = state.call &&
          (callId ? state.call.id === callId : state.call.attendantId === attendantId) &&
          activeStatuses.includes(state.call.status as any)
          ? state.call : undefined;

        if (!completedCall) return {};

        const customer = users.find(u => u.id === completedCall.customerId);
        if (customer) {
          const customerUpdates = byAttendant
            ? { status: 'idle' as const }
            : { status: 'idle' as const, tokens: Math.max(0, (customer.tokens ?? 5) - (completedCall.tokensCharged || 1)) };
          updateUser(customer.id, customerUpdates);
        }

        updateUser(attendantId, { status: 'idle' as const });

        if (currentUser && currentUser.id === completedCall.customerId) {
          if (byAttendant) {
            setCurrentUser({ ...currentUser, status: 'idle' as const });
          } else {
            const nextTokens = Math.max(0, (currentUser.tokens ?? 5) - (completedCall.tokensCharged || 1));
            setCurrentUser({ ...currentUser, tokens: nextTokens, status: 'idle' as const });
          }
        }

        if (currentUser && currentUser.id === completedCall.attendantId) {
          setCurrentUser({ ...currentUser, status: 'idle' as const });
        }

        return { call: null };
      });
    },

    updateCall: (callId, updates) => {
      set((state) => {
        const { updateUser } = useOnlineUsersStore.getState();
        const { currentUser, setCurrentUser } = useCurrentUserStore.getState();
        const call = state.call?.id === callId ? state.call : undefined;
        if (!call) return {};

        if (call.status === 'awaiting-answer' && updates.status === 'active') {
          updateUser(call.attendantId, { status: 'in-call' as const });
          if (currentUser && currentUser.id === call.attendantId) {
            setCurrentUser({ ...currentUser, status: 'in-call' as const });
          }
        }

        if (updates.status === 'call-interrupteded') {
          updates = { ...updates, interruptedAt: Date.now() };
        }

        if (call.status === 'call-interrupteded' && updates.status === 'active') {
          const pauseDuration = call.interruptedAt ? Date.now() - call.interruptedAt : 0;
          updates = {
            ...updates,
            startedAt: (call.startedAt || Date.now()) + pauseDuration,
            interruptedAt: undefined,
          };
        }

        return { call: { ...call, ...updates } };
      });
    },

    resetSimulation: () => {
      set(() => ({ ...initialCallStore }));
    },

    simulateIncomingCall: (attendantId) => {
      set((state) => {
        const users = useOnlineUsersStore.getState().users;
        const attendant = users.find(u => u.id === attendantId);
        if (!attendant) return {};

        const customer = users.find(u => u.role === 'customer' && (u.tokens ?? 5) > 0 && u.status === 'idle');
        if (!customer) return {};

        const isOccupied = state.call?.attendantId === attendantId &&
          ['active', 'awaiting-answer', 'call-interrupteded'].includes(state.call.status);
        if (isOccupied) return {};

        const newCall: CallState = {
          id: `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          customerId: customer.id,
          customerName: customer.name,
          attendantId: attendant.id,
          attendantName: attendant.name,
          roomUrl: generateMeetUrl(),
          status: 'awaiting-answer',
          tokensCharged: 1,
        };

        try { playNotificationChime(); } catch (_) {}

        useOnlineUsersStore.getState().updateUser(customer.id, { status: 'in-call' as const });

        return { call: newCall };
      });
    },

    billingOutOfTokens: (callId) => {
      set((state) => {
        const { updateUser } = useOnlineUsersStore.getState();
        const { currentUser } = useCurrentUserStore.getState();
        const call = state.call?.id === callId ? state.call : undefined;
        if (!call) return {};

        updateUser(call.customerId, { status: 'idle' as const, tokens: 0 });
        updateUser(call.attendantId, { status: 'idle' as const });

        if (currentUser && currentUser.id === call.customerId) {
          const { currentUser: fresh, setCurrentUser } = useCurrentUserStore.getState();
          if (fresh) setCurrentUser({ ...fresh, tokens: 0, status: 'idle' as const });
        }

        return { call: null };
      });
    },
  };
};
