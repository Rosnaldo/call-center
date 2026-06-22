import type { DailyCall } from '@daily-co/daily-js';
import { useOnlineUsersStore, useCurrentUserStore, useIncomingCallStore, useCallViewStore } from '../stores.ts';
import { CallState, initialCallStore } from './state.ts';

export const simulateAnswerIncomingCall = (
  set: (fn: (state: any) => any) => void,
  _daily: DailyCall | null,
) => {
  set((state: any) => {
    const incomingCall = useIncomingCallStore.getState().incomingCall;
    if (!incomingCall) return {};
    if (state.call) return {};

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
      roomName: `${customer.slug}--${attendant.slug}`,
      meetingId: '',
    };

    updateUser(incomingCall.customerId, { status: 'in-call' as const });
    updateUser(incomingCall.attendantId, { status: 'in-call' as const });
    if (currentUser?.id === incomingCall.attendantId) {
      setCurrentUser({ ...currentUser, status: 'in-call' as const });
    }

    useIncomingCallStore.getState().incomingCallCancelled();
    useCallViewStore.getState().setViewState('in-call');

    return { call: newCall };
  });
};

export const simulateCompleteCall = (
  set: (fn: (state: any) => any) => void,
) => {
  set((state: any) => {
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
};

export const simulateUpdateCall = (
  set: (fn: (state: any) => any) => void,
  callId: string,
  updates: Partial<CallState>,
) => {
  set((state: any) => {
    const { updateUser } = useOnlineUsersStore.getState();
    const { currentUser, setCurrentUser } = useCurrentUserStore.getState();
    const call = state.call?.id === callId ? state.call : undefined;
    if (!call) return {};

    updateUser(call.attendantId, { status: 'in-call' as const });
    if (currentUser && currentUser.id === call.attendantId) {
      setCurrentUser({ ...currentUser, status: 'in-call' as const });
    }

    return { call: { ...call, ...updates } };
  });
};

export const simulateResetCall = (
  set: (fn: (state: any) => any) => void,
) => {
  set(() => ({ ...initialCallStore }));
};
