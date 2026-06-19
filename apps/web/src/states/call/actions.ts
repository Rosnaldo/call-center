import { useOnlineUsersStore } from '../online-users/store.ts';
import { useCurrentUserStore } from '../current-user/store.ts';
import { useIncomingCallStore } from '../incoming-call/store.ts';
import { useCallViewStore } from '../call-view/store.ts';
import { playNotificationChime, generateRoomName } from '../../utils/helpers.ts';
import { CallState, CallStore, initialCallStore } from './state.ts';
import { IncomingCallState } from '@repo/shared-types';
import { notifyWsCancelCall } from '../../services/online-users-ws.ts';

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
  receiveIncomingCall: (incoming: IncomingCallState) => void;
  answerIncomingCall: () => void;
  cancelCall: () => void;
  completeCall: () => void;
  updateCall: (callId: string, updates: Partial<CallState>) => void;
  billingOutOfTokens: (callId: string) => void;
  resetSimulation: () => void;
  simulateIncomingCall: (attendantId: string) => void;
  simulateCallAsCustomer: (customerId: string, attendantId: string) => void;
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

    receiveIncomingCall: (incoming) => {
      const { updateUser } = useOnlineUsersStore.getState();
      updateUser(incoming.customerId, { status: 'in-call' as const });
      useIncomingCallStore.getState().setIncomingCall(incoming);
      useCallViewStore.getState().setViewState('lobby');
      try { playNotificationChime(); } catch (_) {}
    },

    answerIncomingCall: () => {
      set((state) => {
        const incomingCall = useIncomingCallStore.getState().incomingCall;
        if (!incomingCall) return {};

        if (state.call?.status === 'active' || state.call?.status === 'call-interrupteded') return {};

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
          roomName: generateRoomName(),
          sessionId: '',
          status: 'active',
          wasAnswered: true,
          startedAt: now,
          tokensCharged: 1,
        };

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

    cancelCall: () => {
      const incomingCall = useIncomingCallStore.getState().incomingCall;
      if (!incomingCall) return;

      const { updateUser } = useOnlineUsersStore.getState();
      updateUser(incomingCall.customerId, { status: 'idle' as const });
      useIncomingCallStore.getState().clearIncomingCall();
      notifyWsCancelCall(incomingCall.attendantId);
      useCallViewStore.getState().setViewState('none');
      useCallViewStore.getState().setSelectedAttendantId(null);
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

        if (call.wasAnswered) updates = { ...updates, wasAnswered: true };

        updateUser(call.attendantId, { status: 'in-call' as const });
        if (currentUser && currentUser.id === call.attendantId) {
          setCurrentUser({ ...currentUser, status: 'in-call' as const });
        }

        return { call: { ...call, ...updates } };
      });
    },

    resetSimulation: () => {
      set((state) => ({ ...initialCallStore, resetSignal: state.resetSignal + 1 }));
    },

    simulateIncomingCall: (attendantId) => {
      set((state) => {
        const users = useOnlineUsersStore.getState().users;
        const attendant = users.find(u => u.id === attendantId);
        if (!attendant) return {};

        const customer = users.find(u => u.role === 'customer' && (u.tokens ?? 5) > 0 && u.status === 'idle');
        if (!customer) return {};

        const existingIncoming = useIncomingCallStore.getState().incomingCall;
        const isOccupied =
          (state.call?.attendantId === attendantId &&
            ['active', 'call-interrupteded'].includes(state.call.status)) ||
          existingIncoming?.attendantId === attendantId;
        if (isOccupied) return {};

        try { playNotificationChime(); } catch (_) {}

        useOnlineUsersStore.getState().updateUser(customer.id, { status: 'in-call' as const });
        useIncomingCallStore.getState().setIncomingCall({ customerId: customer.id, attendantId });
        useCallViewStore.getState().setViewState('lobby');

        return {};
      });
    },

    simulateCallAsCustomer: (customerId, attendantId) => {
      set((state) => {
        const users = useOnlineUsersStore.getState().users;
        const customer = users.find(u => u.id === customerId);
        const attendant = users.find(u => u.id === attendantId);
        if (!customer || !attendant) return {};
        if ((customer.tokens ?? 0) <= 0) return {};
        if (attendant.status !== 'idle') return {};
        if (useIncomingCallStore.getState().incomingCall) return {};
        if (state.call?.customerId === customerId) return {};

        try { playNotificationChime(); } catch (_) {}

        useOnlineUsersStore.getState().updateUser(customerId, { status: 'in-call' as const });
        useIncomingCallStore.getState().setIncomingCall({ customerId, attendantId });

        return {};
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
