import type { DailyCall } from '@daily-co/daily-js';
import { useOnlineUsersStore, useCurrentUserStore, useIncomingCallStore, useCallViewStore } from '../stores.ts';
import { CallState, initialCallStore } from './state.ts';

import { dailyService } from '../../services/daily.ts';

export interface CallActions {
  answerIncomingCall: (daily: DailyCall | null) => void;
  completeCall: () => void;
  updateCall: (callId: string, updates: Partial<CallState>) => void;
  resetSimulation: () => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void
): CallActions => {
  return {
    answerIncomingCall: (daily) => {
      set((state) => {
        const incomingCall = useIncomingCallStore.getState().incomingCall;
        if (!incomingCall) return {};

        if (state.call?.status === 'active') return {};

        const { users, updateUser } = useOnlineUsersStore.getState();
        const { currentUser, setCurrentUser } = useCurrentUserStore.getState();
        const customer = users.find(u => u.id === incomingCall.customerId);
        const attendant = users.find(u => u.id === incomingCall.attendantId);
        if (!customer || !attendant) return {};

        const now = Date.now();
        const newCall: CallState = {
          id: `call-${now}-${Math.floor(Math.random() * 1000)}`,
          customerId: incomingCall.customerId,
          customerName: customer.name,
          attendantId: incomingCall.attendantId,
          attendantName: attendant.name,
          roomName: attendant.slug,
          sessionId: '',
          status: 'active',
          wasAnswered: true,
          startedAt: now,
        };

        if (daily) {
          dailyService.join(daily, attendant.slug);
        }

        updateUser(incomingCall.customerId, { status: 'in-call' as const });
        updateUser(incomingCall.attendantId, { status: 'in-call' as const });
        if (currentUser?.id === incomingCall.attendantId) {
          setCurrentUser({ ...currentUser, status: 'in-call' as const });
        }

        useIncomingCallStore.getState().clearIncomingCall();
        useCallViewStore.getState().setViewState('in-call');

        return { call: newCall };
      });
    },

    completeCall: () => {
      set((state) => {
        const { currentUser, setCurrentUser } = useCurrentUserStore.getState();
        const { updateUser } = useOnlineUsersStore.getState();

        if (currentUser) {
          setCurrentUser({ ...currentUser, status: 'idle' as const });
        }

        if (state.call) {
          updateUser(state.call.customerId, { status: 'idle' as const });
          updateUser(state.call.attendantId, { status: 'idle' as const });
        }

        useCallViewStore.getState().setViewState('none');
        useCallViewStore.getState().setSelectedAttendantId(null);

        return { call: null };
      });
    },

    updateCall: (callId, updates) => {
      set((state) => {
        const { updateUser } = useOnlineUsersStore.getState();
        const { currentUser, setCurrentUser } = useCurrentUserStore.getState();
        const call = state.call?.id === callId ? state.call : undefined;
        if (!call) return {};

        if (call.wasAnswered) updates = { ...updates, wasAnswered: true };

        updateUser(call.attendantId, { status: 'in-call' as const });
        if (currentUser && currentUser.id === call.attendantId) {
          setCurrentUser({ ...currentUser, status: 'in-call' as const });
        }

        return { call: { ...call, ...updates } };
      });
    },

    resetSimulation: () => {
      set(() => ({ ...initialCallStore }));
    },
  };
};
